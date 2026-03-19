const net = require('net');
const os = require('os');

const TV_PORTS = [
  { port: 8001, brand: 'Samsung' },
  { port: 8002, brand: 'Samsung' },
  { port: 3000, brand: 'LG WebOS' },
  { port: 8060, brand: 'Roku' },
  { port: 1925, brand: 'Philips' },
  { port: 55000, brand: 'Panasonic' },
  { port: 9080, brand: 'LG' },
];

function getLocalSubnets() {
  const subnets = [];
  const interfaces = os.networkInterfaces();
  for (const addrs of Object.values(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const parts = addr.address.split('.');
        subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    }
  }
  return subnets;
}

function checkPort(ip, port, timeout = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => resolve(false));
    socket.connect(port, ip);
  });
}

async function scanIP(ip) {
  const hits = await Promise.all(
    TV_PORTS.map(async ({ port, brand }) => {
      const open = await checkPort(ip, port);
      return open ? { port, brand } : null;
    })
  );
  return hits.filter(Boolean);
}

async function portScan(onDevice, concurrency = 40) {
  const subnets = getLocalSubnets();
  const seen = new Set();

  for (const subnet of subnets) {
    const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);

    for (let i = 0; i < ips.length; i += concurrency) {
      const batch = ips.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (ip) => {
          const hits = await scanIP(ip);
          return hits.map(h => ({ ip, ...h }));
        })
      );

      for (const hits of results) {
        for (const hit of hits) {
          if (!seen.has(hit.ip)) {
            seen.add(hit.ip);
            onDevice({
              ip: hit.ip,
              source: 'Port Scan',
              friendlyName: hit.ip,
              manufacturer: hit.brand,
              modelName: `port ${hit.port}`,
            });
          }
        }
      }
    }
  }
}

module.exports = { portScan };
