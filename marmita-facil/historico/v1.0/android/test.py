from pathlib import Path
import argparse, os, subprocess, urllib.request, hashlib, zipfile

p=argparse.ArgumentParser()
p.add_argument('--jdk',required=True,type=Path)
p.add_argument('--android-jar',required=True,type=Path)
a=p.parse_args()
root=Path(__file__).resolve().parent
deps=root/'build/test-deps'
deps.mkdir(parents=True,exist_ok=True)
jar=deps/'json-20250107.jar'
url='https://repo.maven.apache.org/maven2/org/json/json/20250107/json-20250107.jar'
if not jar.exists():
    jar.write_bytes(urllib.request.urlopen(url,timeout=60).read())
expected=urllib.request.urlopen(url+'.sha1',timeout=60).read().decode().split()[0]
assert hashlib.sha1(jar.read_bytes()).hexdigest()==expected
classpath=os.pathsep.join(str(x) for x in [jar,a.android_jar.resolve(),root/'build/classes.jar'])
out=root/'build/test-classes'
out.mkdir(exist_ok=True)
subprocess.run([str(a.jdk.resolve()/'bin/javac.exe'),'-encoding','UTF-8','-cp',classpath,'-d',str(out),str(root/'tests/RulesTest.java')],check=True)
testjar=root/'build/tests.jar'
with zipfile.ZipFile(testjar,'w') as z:
    for f in out.rglob('*.class'):z.write(f,f.relative_to(out).as_posix())
subprocess.run([str(a.jdk.resolve()/'bin/java.exe'),'-cp',str(testjar)+os.pathsep+classpath,'br.com.marmitafacil.app.RulesTest'],check=True)
