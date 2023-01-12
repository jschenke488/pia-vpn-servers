const { readdirSync, readFileSync, writeFileSync, unlinkSync, rmSync, existsSync } = require('fs');
const { resolve } = require('path');
const axios = require('axios');
const degit = require('degit');

function getFiles(path) {
    try {
        return readdirSync(resolve(path));
    } catch (err) {
        console.error(err);
    }
}

if (existsSync(resolve('./PIA-servers'))) rmSync(resolve('./PIA-servers'), { recursive: true, force: true });

const emitter = degit('Lars-/PIA-servers/regions');

emitter.on('info', info => {
    console.log(info.message);
});

emitter.clone(resolve('./PIA-servers')).then(() => {
    console.log('cloned');
    const _regions = getFiles('./PIA-servers');
    let regions = { 'au': {}, 'ca': {}, 'de': {}, 'uk': {}, 'us': {} };
    for (const region of _regions) {
        let addresses = getFiles(`./PIA-servers/${region}`);
        for (let i = 0; i < addresses.length; i++) addresses[i] = addresses[i].replace('.ovpn', '').replaceAll('-', '.');
        if (region.toLowerCase().startsWith('au') && region.toLowerCase().trim() != 'austria') regions['au'][region.substring(2).trim()] = addresses;
        else if (region.toLowerCase().startsWith('ca') && region.toLowerCase().trim() != 'cambodia') regions['ca'][region.substring(2).trim()] = addresses;
        else if (region.toLowerCase().startsWith('de') && region.toLowerCase().trim() != 'denmark') regions['de'][region.substring(2).trim()] = addresses;
        else if (region.toLowerCase().startsWith('uk') && region.toLowerCase().trim() != 'ukraine') regions['uk'][region.substring(2).trim()] = addresses;
        else if (region.toLowerCase().startsWith('us')) regions['us'][region.substring(2).trim()] = addresses;
        else regions[region] = addresses;
    }
    rmSync(resolve('./PIA-servers'), { recursive: true, force: true });
    for (const _region of ['au', 'ca', 'de', 'uk', 'us']) {
        let all = [];
        for (const region of Object.keys(regions[_region]))
            for (const address of regions[_region][region])
                all.push(address);
        regions[_region]['all'] = all;
    }
    let all = [];
    for (const region of ['au', 'ca', 'de', 'uk', 'us'])
        for (const address of regions[region]['all'])
            all.push(address);
    for (const region of Object.keys(regions))
        if (!['au', 'ca', 'de', 'uk', 'us'].includes(region))
            for (const address of regions[region])
                all.push(address);
    regions['all'] = all;
    if (existsSync(resolve('./regions.json'))) unlinkSync(resolve('./regions.json'));
    writeFileSync(resolve('./regions.json'), JSON.stringify(regions));

    let allowedAddresses = (existsSync(resolve('./additionalAllowedIPs.txt'))) ? readFileSync(resolve('./additionalAllowedIPs.txt')).toString().split('\n').filter(val => { return (val.includes('.') || val.includes(':')) && !val.trim().startsWith('#') }) : [];
    
    // TODO
    // add allowed regions to config file
    for (const address of regions['us']['all']) allowedAddresses.push(address);
    for (const address of regions['ca']['all']) allowedAddresses.push(address);

    for (let i = 0; i < allowedAddresses.length; i++) allowedAddresses[i] = allowedAddresses[i].trim()
    allowedAddresses = allowedAddresses.filter(val => { return (val.includes('.') || val.includes(':')) && !val.trim().startsWith('#') })

    const params = new URLSearchParams({ txt: allowedAddresses.join('\r\n') });
    params.append('why', '');
    params.append('why-asn', '');
    params.append('output', 'CIDR');
    params.append('post', 'Submit');
    axios.post('https://tehnoblog.org/ip-tools/ip-address-aggregator/', params).then(res => {
        if (existsSync(resolve('./allowedCIDRs.txt'))) unlinkSync(resolve('./allowedCIDRs.txt'));
        writeFileSync(resolve('./allowedCIDRs.txt'), res.data.toString().split('id="results">')[1].split('</pre>')[0].trim());
        console.log('done');
    }).catch(err => {
        console.error(err);
    })
});