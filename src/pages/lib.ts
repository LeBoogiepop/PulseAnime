import p5 from 'p5';
import { fetchLibraryScenes, incrementDownloadCount, type LibraryScene } from '../services/library';
import { initAuth, onAuthStateChange, signIn } from '../services/auth';
import { t, getLang, setLang } from '../i18n';
import { LandingPage } from '../sketches/Library';
import type { AudioData } from '../types';

/** Nom de scène traduit (aligné page principale), fallback Supabase */
function getSceneName(scene: LibraryScene): string {
  const key = `sketch_${scene.sketch_id}_name`;
  const translated = t(key);
  return translated !== key ? translated : scene.title;
}

/** Description de scène traduite (alignée page principale), fallback Supabase */
function getSceneDesc(scene: LibraryScene): string {
  const key = `sketch_${scene.sketch_id}_desc`;
  const translated = t(key);
  return translated !== key ? translated : (scene.description || '');
}

const grid = document.getElementById('lib-grid') as HTMLDivElement;
const emptyEl = document.getElementById('lib-empty') as HTMLDivElement;
const authGate = document.getElementById('lib-auth-gate') as HTMLDivElement;
const libContent = document.getElementById('lib-content') as HTMLDivElement;

let scenes: LibraryScene[] = [];
let currentFilter = 'all';

function showLibrary() {
  authGate?.classList.add('hidden');
  libContent?.classList.remove('hidden');
}

function showAuthGate() {
  authGate?.classList.remove('hidden');
  authGate?.classList.add('flex');
  libContent?.classList.add('hidden');
}

function setUserEmail(email: string) {
  const el = document.getElementById('lib-user-email');
  if (el) {
    el.textContent = email;
    el.classList.toggle('hidden', !email);
  }
}

const previewOverlay = document.getElementById('lib-preview-overlay') as HTMLDivElement;
const previewIframe = document.getElementById('lib-preview-iframe') as HTMLIFrameElement;
const previewTitle = document.getElementById('lib-preview-title') as HTMLSpanElement;
const previewCloseBtn = document.getElementById('lib-preview-close') as HTMLButtonElement;
const langToggle = document.getElementById('lib-lang-toggle') as HTMLButtonElement;

function updateLibUIText() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) (el as HTMLInputElement).placeholder = t(key);
  });
  if (langToggle) langToggle.textContent = getLang() === 'en' ? 'FR' : 'EN';
  document.documentElement.lang = getLang();
  document.title = t('lib_page_title');
}

function openPreview(scene: LibraryScene) {
  const previewUrl = `${window.location.origin}/?sketch=${scene.sketch_id}`;
  if (previewIframe) previewIframe.src = previewUrl;
  if (previewTitle) previewTitle.textContent = getSceneName(scene);
  if (previewOverlay) {
    previewOverlay.classList.remove('hidden');
    previewOverlay.classList.add('flex');
  }
}

function closePreview() {
  if (previewIframe) previewIframe.src = 'about:blank';
  if (previewOverlay) {
    previewOverlay.classList.add('hidden');
    previewOverlay.classList.remove('flex');
  }
}

/** Mapping sketch_id → image (public/image/) - prioritaire sur Supabase */
const SCENE_IMAGES: Record<string, string> = {
  water_lily: '/image/water-lily.png',
  color_shift: '/image/chromatic.png',
  golden_scars: '/image/golden-scars.png',
  partition: '/image/noise-partition.png',
  travel: '/image/travel.png',
  plexus: '/image/plexus-net.png',
  box_tunnel: '/image/concert-tunnel.png',
  samuel_yan_shader: '/image/chromatic.png',
};

function renderCard(scene: LibraryScene): string {
  const name = getSceneName(scene);
  const desc = getSceneDesc(scene);
  const tags = (scene.tags || []).map(tag => `<span class="text-[9px] px-1.5 py-0.5 border border-white/10 text-gray-500 uppercase">${tag}</span>`).join('');
  const imgUrl = SCENE_IMAGES[scene.sketch_id] || scene.image_url || '/image/water-lily.png';

  return `
    <div class="scene-card bg-black border border-white/10 flex flex-col h-full" data-tags="${(scene.tags || []).join(',')}">
      <div class="h-40 overflow-hidden border-b border-white/10">
        <img src="${imgUrl}" alt="${name}" class="w-full h-full object-cover opacity-90 hover:opacity-100 transition-all"
          onerror="this.src='/image/water-lily.png'">
      </div>
      <div class="p-4 flex-1 flex flex-col">
        <h3 class="text-sm font-bold text-white font-mono uppercase mb-2">${name}</h3>
        <p class="text-[10px] text-gray-500 font-mono leading-relaxed mb-4 line-clamp-2">${desc}</p>
        <div class="flex flex-wrap gap-1 mb-4">${tags}</div>
        <div class="mt-auto flex justify-between items-end pt-3 border-t border-white/5">
          <span class="text-[9px] text-gray-600 uppercase">${scene.author}</span>
          <div class="flex gap-2">
            <button data-preview="${scene.sketch_id}" data-title="${name.replace(/"/g, '&quot;')}" class="px-2 py-1 border border-white/20 text-[10px] font-mono uppercase hover:bg-white hover:text-black transition-colors">
              ${t('lib_add_to_viz')}
            </button>
            <button data-dl="${scene.id}" class="px-2 py-1 border border-white/20 text-[10px] font-mono uppercase hover:bg-white hover:text-black transition-colors">
              DL:${scene.download_count}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function matchesFilter(scene: LibraryScene, filter: string): boolean {
  if (filter === 'all') return true;
  return (scene.tags || []).some(t => t.toLowerCase().includes(filter.toLowerCase()));
}

function render() {
  const filtered = scenes.filter(s => matchesFilter(s, currentFilter));
  if (grid) {
    grid.innerHTML = filtered.map(renderCard).join('');
    grid.querySelectorAll('[data-dl]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.dl;
        if (id) {
          await incrementDownloadCount(id);
          const s = scenes.find(x => x.id === id);
          if (s) { s.download_count++; render(); }
        }
      });
    });
    grid.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sketchId = (e.currentTarget as HTMLElement).dataset.preview;
        const s = scenes.find(x => x.sketch_id === sketchId);
        if (s) openPreview(s);
      });
    });
  }
  if (emptyEl) {
    emptyEl.classList.toggle('hidden', filtered.length > 0);
  }
}

if (previewCloseBtn) previewCloseBtn.addEventListener('click', closePreview);

if (langToggle) {
  langToggle.addEventListener('click', () => {
    const next = getLang() === 'en' ? 'fr' : 'en';
    setLang(next);
    updateLibUIText();
    render();
  });
}

document.querySelectorAll('.lib-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lib-filter').forEach(b => {
      b.classList.remove('bg-white', 'text-black');
      b.classList.add('border-white/20', 'text-gray-400');
    });
    btn.classList.add('bg-white', 'text-black');
    btn.classList.remove('border-white/20', 'text-gray-400');
    currentFilter = (btn as HTMLElement).dataset.filter || 'all';
    render();
  });
});

async function loadLibrary() {
  scenes = await fetchLibraryScenes();
  render();
}

function initAuthForm() {
  const emailInput = document.getElementById('lib-auth-email') as HTMLInputElement;
  const passwordInput = document.getElementById('lib-auth-password') as HTMLInputElement;
  const submitBtn = document.getElementById('lib-auth-submit') as HTMLButtonElement;
  const messageEl = document.getElementById('lib-auth-message') as HTMLDivElement;

  const showMsg = (msg: string, isErr = false) => {
    if (!messageEl) return;
    messageEl.textContent = msg;
    messageEl.classList.remove('hidden');
    messageEl.className = `text-xs ${isErr ? 'text-red-500' : 'text-green-500'}`;
  };

  submitBtn?.addEventListener('click', async () => {
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value;
    if (!email || !password) {
      showMsg(t('lib_auth_required'), true);
      return;
    }
    submitBtn.disabled = true;
    const { error } = await signIn(email, password);
    submitBtn.disabled = false;
    if (error) {
      showMsg(error.message || t('lib_auth_error'), true);
      return;
    }
    showLibrary();
    loadLibrary();
  });
}

const SILENT_AUDIO: AudioData = {
  level: 0, energy: 0, subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0,
  spectrum: new Uint8Array(1024),
  waveform: new Uint8Array(1024),
};

function initLibBackground() {
  const container = document.getElementById('lib-canvas-container');
  if (!container) return;

  LandingPage.hideText = true;
  const landing = new LandingPage();

  const sketch = (p: p5) => {
    p.setup = () => {
      p.createCanvas(window.innerWidth, window.innerHeight, p.WEBGL);
      p.frameRate(60);
      landing.setup(p);
    };
    p.draw = () => {
      landing.draw(p, SILENT_AUDIO);
    };
    p.windowResized = () => {
      p.resizeCanvas(window.innerWidth, window.innerHeight);
    };
  };

  new p5(sketch, container);
}

async function init() {
  setLang('en');
  initLibBackground();
  updateLibUIText();
  initAuth();
  initAuthForm();

  onAuthStateChange(({ user }) => {
    if (user) {
      setUserEmail(user.email || '');
      showLibrary();
      loadLibrary();
    } else {
      setUserEmail('');
      showAuthGate();
    }
  });
}

init();
