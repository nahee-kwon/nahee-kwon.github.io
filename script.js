// 유튜브 주소 → 임베드
function youtubeId(url) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function loadVideo(el) {
  if (el.dataset.loaded) return;
  el.dataset.loaded = '1';
  const id = youtubeId(el.dataset.youtube || '');
  if (!id) {
    el.innerHTML = '<div class="placeholder">유튜브 링크를 입력해주세요</div>';
    return;
  }
  el.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}" title="YouTube video"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

// 다른 페이지로 넘어가면 재생 중인 영상 정지
function stopVideo(el) {
  const iframe = el.querySelector('iframe');
  if (iframe) iframe.src = iframe.src;
}

// PDF → 페이지 바로 보이게 렌더링 (pdf.js)
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function loadPdf(el) {
  if (el.dataset.loaded) return;
  el.dataset.loaded = '1';
  const src = el.dataset.src;
  if (!src) { el.remove(); return; }
  const fileName = el.dataset.download || src.split('/').pop();

  el.innerHTML = `
    <div class="pdf-bar">
      <span>${fileName}</span>
      <div class="pdf-actions">
        <a class="btn" href="${src}" target="_blank" rel="noopener">새 창으로 보기</a>
        <a class="btn" href="${src}" download="${fileName}">PDF 다운로드</a>
      </div>
    </div>
    <div class="pdf-pages"><div class="placeholder">PDF 불러오는 중…</div></div>`;
  const pages = el.querySelector('.pdf-pages');

  try {
    const pdf = await pdfjsLib.getDocument(src).promise;
    pages.innerHTML = '';
    const width = pages.clientWidth;
    const ratio = window.devicePixelRatio || 1;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (width / base.width) * ratio });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      pages.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  } catch (e) {
    // 내 컴퓨터에서 파일을 직접 열면(file://) pdf.js가 막히므로 브라우저 기본 뷰어로 대체
    if (location.protocol === 'file:') {
      pages.innerHTML = `<iframe src="${src}" title="${fileName}"></iframe>`;
    } else {
      pages.innerHTML = `<div class="placeholder">PDF 파일을 찾을 수 없습니다 (${src})</div>`;
    }
  }
}

// 홈 버튼: 'Level Design' 가로 길이가 'NAHEE KWON'을 넘지 않게 글자 크기 자동 조절
// ✏️ ROLE_SCALE: 'NAHEE KWON' 폭에 꽉 맞춘 크기의 몇 배로 할지 (1 = 같은 폭)
const ROLE_SCALE = 0.7;
function fitLogo() {
  const main = document.querySelector('.name-main');
  const role = document.querySelector('.name-role');
  if (!main || !role) return;
  role.style.fontSize = '';
  // 'Level Design' 한 줄만 재기 위해 잠깐 '<br>' 앞 글자만 남김
  const html = role.innerHTML;
  role.textContent = role.textContent.split('Portfolio')[0];
  const size = parseFloat(getComputedStyle(role).fontSize);
  const ratio = main.getBoundingClientRect().width / role.getBoundingClientRect().width;
  role.innerHTML = html;
  role.style.fontSize = Math.floor(size * ratio * ROLE_SCALE * 2) / 2 + 'px';
}
document.fonts.ready.then(fitLogo);
window.addEventListener('resize', fitLogo);

// 메인 썸네일: 자동으로 순서대로 전환, 메뉴에 마우스를 올리면 해당 썸네일 표시
const thumbLinks = [...document.querySelectorAll('.nav a[data-thumb]')];
const showcase = document.querySelector('.showcase');

if (showcase && thumbLinks.length) {
  const frame = showcase.querySelector('.showcase-frame');
  const label = showcase.querySelector('.label');
  const title = showcase.querySelector('.showcase-title');
  const tags = showcase.querySelector('.showcase-tags');
  const imgs = thumbLinks.map(a => {
    const img = new Image();
    img.src = a.dataset.thumb;
    img.alt = a.dataset.title || a.textContent;
    frame.appendChild(img);
    return img;
  });
  let current = 0;
  let timer;

  function show(i) {
    current = i;
    imgs.forEach((img, k) => img.classList.toggle('on', k === i));
    const a = thumbLinks[i];
    showcase.setAttribute('href', a.getAttribute('href'));
    label.textContent = 'Project ' + String(i + 1).padStart(2, '0');
    title.textContent = a.dataset.title || a.textContent;
    tags.innerHTML = '';
    (a.dataset.tags || '').split(',').filter(t => t.trim()).forEach(t => {
      const li = document.createElement('li');
      li.textContent = '#' + t.trim();
      tags.appendChild(li);
    });
  }

  // 마지막으로 표시된 썸네일 다음부터 다시 순서대로
  function start() {
    clearInterval(timer);
    timer = setInterval(() => show((current + 1) % imgs.length), 5000);
  }

  thumbLinks.forEach((a, i) => {
    a.addEventListener('mouseenter', () => { clearInterval(timer); show(i); });
    a.addEventListener('mouseleave', start);
  });

  show(0);
  start();
}

// 페이지 전환: 주소의 #project-a 등에 맞는 페이지만 표시 (없으면 홈)
const pageEls = [...document.querySelectorAll('main section[id]')];
const links = document.querySelectorAll('.nav a');

function route() {
  const id = location.hash.slice(1);
  const current = pageEls.find(p => p.id === id) || pageEls[0];

  pageEls.forEach(p => {
    if (p !== current && !p.hidden) p.querySelectorAll('.video').forEach(stopVideo);
    p.hidden = p !== current;
  });
  links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));

  current.querySelectorAll('.video').forEach(loadVideo);
  current.querySelectorAll('.pdf').forEach(loadPdf);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', route);
route();
