"""Run optional WhatsApp pure-JVM checks without modifying app build output."""
from pathlib import Path
import argparse, os, subprocess, zipfile

p=argparse.ArgumentParser()
p.add_argument('--jdk',required=True,type=Path)
p.add_argument('--android-jar',required=True,type=Path)
p.add_argument('--sdk-tools',required=True,type=Path)
a=p.parse_args()
root=Path(__file__).resolve().parent
out=root/'build/sync-test-classes'
out.mkdir(parents=True,exist_ok=True)
json=root/'build/test-deps/json-20250107.jar'
if not json.exists():raise RuntimeError('Execute test.py primeiro para obter a dependência JSON dos testes.')
sources=root/'app/src/main/java/br/com/marmitafacil/app'
command=[str(a.jdk.resolve()/'bin/javac.exe'),'-encoding','UTF-8','-source','8','-target','8',
    '-bootclasspath',str(a.sdk_tools.resolve()/'core-lambda-stubs.jar')+os.pathsep+str(a.android_jar.resolve()),
    '-d',str(out)]+[str(sources/name) for name in ['Rules.java','Store.java','WhatsAppSync.java','WhatsAppSyncJob.java']]+[str(root/'tests/WhatsAppValidationTest.java')]
subprocess.run(command,check=True)
jar=root/'build/sync-tests.jar'
with zipfile.ZipFile(jar,'w')as z:
    for f in out.rglob('*.class'):z.write(f,f.relative_to(out).as_posix())
classpath=os.pathsep.join(str(x) for x in [jar,json,a.android_jar.resolve()])
subprocess.run([str(a.jdk.resolve()/'bin/java.exe'),'-cp',classpath,'br.com.marmitafacil.app.WhatsAppValidationTest'],check=True)
