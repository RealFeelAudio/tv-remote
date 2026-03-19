const { Client: SsdpClient } = require('node-ssdp');
const axios = require('axios');
const xml2js = require('xml2js');

async function fetchDeviceDescription(url) {
  try {
    const res = await axios.get(url, { timeout: 3000 });
    const result = await xml2js.parseStringPromise(res.data);
    const device = result?.root?.device?.[0];
    if (!device) return null;
    return {
      friendlyName: device.friendlyName?.[0] || null,
      manufacturer: device.manufacturer?.[0] || null,
      modelName: device.modelName?.[0] || null,
      modelDescription: device.modelDescription?.[0] || null,
    };
  } catch {
    return null;
  }
}

function ssdpScan(onDevice, timeout = 6000) {
  return new Promise((resolve) => {
    const client = new SsdpClient();
    const seen = new Set();

    client.on('response', async (headers, statusCode, rinfo) => {
      const ip = rinfo.address;
      if (seen.has(ip)) return;
      seen.add(ip);

      const device = {
        ip,
        source: 'SSDP',
        friendlyName: ip,
        manufacturer: 'Unknown',
        modelName: '',
      };

      if (headers.LOCATION) {
        const info = await fetchDeviceDescription(headers.LOCATION);
        if (info) {
          if (info.friendlyName) device.friendlyName = info.friendlyName;
          if (info.manufacturer) device.manufacturer = info.manufacturer;
          if (info.modelName) device.modelName = info.modelName;
        }
      }

      onDevice(device);
    });

    client.search('ssdp:all');

    setTimeout(() => {
      try { client.stop(); } catch {}
      resolve();
    }, timeout);
  });
}

module.exports = { ssdpScan };
