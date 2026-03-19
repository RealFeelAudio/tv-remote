const mdns = require('multicast-dns');

const TV_SERVICES = [
  { name: '_googlecast._tcp.local', brand: 'Google Cast' },
  { name: '_ecp._tcp.local',        brand: 'Roku' },
  { name: '_airplay._tcp.local',    brand: 'Apple TV' },
  { name: '_viziocast._tcp.local',  brand: 'Vizio' },
  { name: '_dial._tcp.local',       brand: 'DIAL Device' },
];

function mdnsScan(onDevice, timeout = 6000) {
  return new Promise((resolve) => {
    const m = mdns();
    const seen = new Set();

    m.on('response', (response) => {
      const allRecords = [...response.answers, ...(response.additionals || [])];

      for (const answer of response.answers) {
        if (answer.type !== 'PTR') continue;

        const service = TV_SERVICES.find(s => s.name === answer.name);
        if (!service) continue;

        const aRecord = allRecords.find(r => r.type === 'A');
        const srvRecord = allRecords.find(r => r.type === 'SRV');
        if (!aRecord) continue;

        const ip = aRecord.data;
        if (seen.has(ip)) continue;
        seen.add(ip);

        const rawName = answer.data || srvRecord?.name || '';
        const friendlyName = rawName.split('._')[0] || ip;

        onDevice({
          ip,
          source: 'mDNS',
          friendlyName,
          manufacturer: service.brand,
          modelName: '',
        });
      }
    });

    TV_SERVICES.forEach(({ name }) => {
      m.query({ questions: [{ name, type: 'PTR' }] });
    });

    setTimeout(() => {
      try { m.destroy(); } catch {}
      resolve();
    }, timeout);
  });
}

module.exports = { mdnsScan };
