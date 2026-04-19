const OTHER_MACHINE_IP = '10.198.247.254';  // ← replace with actual IP

const res = await fetch(`http://${OTHER_MACHINE_IP}:3000/getmanifest`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ /* any data their endpoint expects */ }),
});

const data = await res.json();
console.log(data);