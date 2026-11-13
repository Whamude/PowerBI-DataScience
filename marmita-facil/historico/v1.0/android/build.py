"""Build the offline APK with official Android SDK tools (no third-party runtime)."""
from pathlib import Path
import argparse, hashlib, json, os, secrets, subprocess, zipfile, xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('--jdk', required=True, type=Path)
parser.add_argument('--sdk-tools', required=True, type=Path)
parser.add_argument('--android-jar', required=True, type=Path)
parser.add_argument('--output', type=Path, default=Path('MarmitaFacil-1.0.apk'))
args = parser.parse_args()
ROOT = Path(__file__).resolve().parent
BUILD = ROOT / 'build'
BUILD.mkdir(exist_ok=True)
main = ROOT / 'app/src/main'
sdk = args.sdk_tools.resolve()
jdk = args.jdk.resolve()
android = args.android_jar.resolve()
env = dict(os.environ)
env['JAVA_HOME'] = str(jdk)
env['PATH'] = str(jdk / 'bin') + os.pathsep + env.get('PATH', '')

def run(*cmd):
    subprocess.run([str(c) for c in cmd], cwd=ROOT, env=env, check=True)

run(sdk / 'aapt2.exe', 'compile', '--dir', main / 'res', '-o', BUILD / 'resources.zip')
generated = BUILD / 'generated'
generated.mkdir(exist_ok=True)
ET.register_namespace('android', 'http://schemas.android.com/apk/res/android')
manifest = ET.parse(main / 'AndroidManifest.xml')
manifest.getroot().set('package', 'br.com.marmitafacil.app')
manifest.write(BUILD / 'AndroidManifest.xml', encoding='utf-8', xml_declaration=True)
run(sdk / 'aapt2.exe', 'link', '-I', android, '--manifest', BUILD / 'AndroidManifest.xml',
    '--java', generated, '-o', BUILD / 'unsigned.apk', BUILD / 'resources.zip')
classes = BUILD / 'classes'
classes.mkdir(exist_ok=True)
sources = sorted((main / 'java').rglob('*.java')) + sorted(generated.rglob('*.java'))
source_list = BUILD / 'sources.txt'
source_list.write_text('\n'.join('"' + str(p).replace('\\', '/') + '"' for p in sources), encoding='utf-8')
run(jdk / 'bin/javac.exe', '-encoding', 'UTF-8', '-source', '8', '-target', '8',
    '-bootclasspath', str(sdk / 'core-lambda-stubs.jar') + os.pathsep + str(android),
    '-d', classes, '@' + str(source_list))
for required in ['MainActivity.class', 'Rules.class', 'Store.class']:
    if not (classes / 'br/com/marmitafacil/app' / required).is_file():
        raise RuntimeError('Compilação incompleta: ' + required)
with zipfile.ZipFile(BUILD / 'classes.jar', 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in classes.rglob('*.class'):
        archive.write(file, file.relative_to(classes).as_posix())
dex = BUILD / 'dex'
dex.mkdir(exist_ok=True)
run(jdk / 'bin/java.exe', '-cp', sdk / 'lib/d8.jar', 'com.android.tools.r8.D8',
    '--release', '--lib', android, '--min-api', '23', '--output', dex, BUILD / 'classes.jar')
with zipfile.ZipFile(BUILD / 'unsigned.apk', 'a', zipfile.ZIP_DEFLATED) as archive:
    for file in dex.glob('*.dex'):
        archive.write(file, file.name)
run(sdk / 'zipalign.exe', '-f', '-p', '4', BUILD / 'unsigned.apk', BUILD / 'aligned.apk')
signing = ROOT / 'signing'
signing.mkdir(exist_ok=True)
credentials = signing / 'credentials.json'
if not credentials.exists():
    credentials.write_text(json.dumps({'alias':'marmita-facil','password':secrets.token_urlsafe(32)}, indent=2), encoding='utf-8')
key = json.loads(credentials.read_text(encoding='utf-8'))
env['MARMITA_KEY_PASSWORD'] = key['password']
keystore = signing / 'marmita-facil.p12'
if not keystore.exists():
    run(jdk / 'bin/keytool.exe', '-genkeypair', '-keystore', keystore, '-storetype', 'PKCS12',
        '-alias', key['alias'], '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
        '-dname', 'CN=Marmita Facil, O=Marmita Facil, C=BR',
        '-storepass:env', 'MARMITA_KEY_PASSWORD', '-keypass:env', 'MARMITA_KEY_PASSWORD')
output = args.output.resolve()
output.parent.mkdir(exist_ok=True, parents=True)
run(jdk / 'bin/java.exe', '-jar', sdk / 'lib/apksigner.jar', 'sign', '--ks', keystore,
    '--ks-key-alias', key['alias'], '--ks-pass', 'env:MARMITA_KEY_PASSWORD',
    '--v1-signing-enabled', 'true', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
    '--v4-signing-enabled', 'false', '--out', output, BUILD / 'aligned.apk')
run(jdk / 'bin/java.exe', '-jar', sdk / 'lib/apksigner.jar', 'verify', '--verbose', output)
run(sdk / 'zipalign.exe', '-c', '-p', '4', output)
print('APK: ' + str(output))
print('SHA256: ' + hashlib.sha256(output.read_bytes()).hexdigest())
