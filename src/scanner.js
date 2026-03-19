const { ssdpScan } = require('./ssdp');
const { mdnsScan } = require('./mdns');
const { portScan } = require('./portscan');

async function scan(onDevice) {
  const seen = new Set();

  const emit = (device) => {
    if (seen.has(device.ip)) return;
    seen.add(device.ip);
    console.log(`[${device.source}] Found: ${device.friendlyName} (${device.ip}) - ${device.manufacturer}`);
    onDevice(device);
  };

  await Promise.all([
    ssdpScan(emit),
    mdnsScan(emit),
    portScan(emit),
  ]);
}

module.exports = { scan };
