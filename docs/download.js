'use strict';
(() => {
  const repository = 'pedrobalsa/multipoke-app-releases';
  const api = `https://api.github.com/repos/${repository}/releases/latest`;
  const fallbackVersion = '0.1.17';
  const button = document.getElementById('download-button');
  const meta = document.getElementById('download-meta');
  const status = document.getElementById('download-status');
  const retry = document.getElementById('download-retry');
  const checksumLink = document.getElementById('checksum-link');
  const checksumVersion = document.getElementById('checksum-version');
  const hash = document.getElementById('installer-hash');
  const hashLabel = document.getElementById('hash-label');
  const hashVersion = document.getElementById('hash-version');
  let activeVersion = fallbackVersion;
  let loading = false;
  function compareVersions(a, b) {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    for (let i = 0; i < 3; i += 1) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
    return 0;
  }
  function officialAsset(asset, version, name) {
    if (!asset || asset.name !== name || !Number.isSafeInteger(asset.size) || asset.size <= 0) return null;
    try {
      const url = new URL(asset.browser_download_url);
      const expectedPath = `/${repository}/releases/download/v${version}/${name}`;
      if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash || url.pathname !== expectedPath) return null;
      return { url: url.href, size: asset.size, digest: typeof asset.digest === 'string' ? asset.digest : '' };
    } catch { return null; }
  }
  async function checkLatest() {
    if (loading) return;
    loading = true;
    retry.disabled = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(api, { headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error('Version lookup failed');
      const release = await response.json();
      const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(release.tag_name || '');
      if (!match || match.slice(1).some(part => !Number.isSafeInteger(Number(part))) || release.draft || release.prerelease || !Array.isArray(release.assets)) throw new Error('Invalid release');
      const version = match.slice(1).join('.');
      if (compareVersions(version, activeVersion) < 0) throw new Error('Older release');
      const name = `MultiPoke-App-Setup-${version}.exe`;
      const installer = officialAsset(release.assets.find(asset => asset.name === name), version, name);
      if (!installer) throw new Error('Installer unavailable');
      const checksum = officialAsset(release.assets.find(asset => asset.name === 'SHA256SUMS.txt'), version, 'SHA256SUMS.txt');
      button.href = installer.url;
      activeVersion = version;
      const size = (installer.size / (1024 * 1024)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      meta.textContent = `Versão ${version} · Windows 64 bits · ${size} MB`;
      checksumLink.hidden = !checksum;
      if (checksum) { checksumLink.href = checksum.url; checksumVersion.textContent = version; }
      const digest = /^sha256:([a-f0-9]{64})$/i.exec(installer.digest);
      hash.hidden = !digest;
      hashLabel.hidden = !digest;
      if (digest) { hash.textContent = digest[1].toLowerCase(); hashVersion.textContent = version; }
      status.textContent = '';
      retry.hidden = true;
    } catch {
      status.textContent = `Não foi possível consultar a versão mais recente agora. O botão continua baixando a versão ${activeVersion}; você pode atualizar pelo app após instalar.`;
      retry.hidden = false;
    } finally {
      window.clearTimeout(timer);
      retry.disabled = false;
      loading = false;
    }
  }
  retry.addEventListener('click', checkLatest);
  checkLatest();
})();
