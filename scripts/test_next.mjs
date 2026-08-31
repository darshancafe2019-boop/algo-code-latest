async function run() {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/upstox/status');
    console.log('Status:', res.status);
    console.log('Headers:', [...res.headers.entries()]);
    console.log('Body:', await res.text());
  } catch (e) {
    console.error('Error:', e);
  }
}
run();
