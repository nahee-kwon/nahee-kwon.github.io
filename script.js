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
  // 유튜브 기본 화면은 썸네일이 흐릿하게 나와서, 고화질 썸네일(1280x720)을 먼저 보여주고 클릭하면 재생
  el.innerHTML = `<button class="video-cover" type="button" aria-label="영상 재생">
    <img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" alt="">
    <span class="video-play"></span></button>`;
  const img = el.querySelector('img');
  // 고화질 썸네일이 없는 영상이면 한 단계 낮은 화질로 대체
  img.addEventListener('load', () => {
    if (img.naturalWidth <= 120) img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }, { once: true });
  el.querySelector('.video-cover').addEventListener('click', () => {
    el.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" title="YouTube video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  });
}

// 다른 페이지로 넘어가면 재생 중인 영상 정지 (다시 썸네일 화면으로 되돌림)
function stopVideo(el) {
  if (!el.querySelector('iframe')) return;
  delete el.dataset.loaded;
  loadVideo(el);
}

// 미리보기: 왼쪽 큰 화면 + 오른쪽 세로 썸네일 목록 (.mp4는 자동 재생 동영상, 나머지는 이미지)
const isVideoFile = src => /\.(mp4|webm|mov)$/i.test(src);

function loadPreview(body) {
  if (body.dataset.loaded) return;
  body.dataset.loaded = '1';
  const items = (body.dataset.items || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!items.length) { body.closest('.preview').remove(); return; }

  body.innerHTML = '<div class="preview-main"></div><div class="preview-list"><div class="preview-scroll"></div></div>';
  const main = body.querySelector('.preview-main');
  const scroll = body.querySelector('.preview-scroll');

  const thumbs = items.map((src, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preview-thumb' + (isVideoFile(src) ? ' is-video' : '');
    btn.setAttribute('aria-label', '미리보기 ' + (i + 1));
    // 동영상 썸네일은 영상 1초 지점 장면을 보여줌
    btn.innerHTML = isVideoFile(src)
      ? `<video src="${src}#t=1" muted playsinline preload="metadata"></video>`
      : `<img src="${src}" alt="" loading="lazy">`;
    btn.addEventListener('click', () => select(i));
    scroll.appendChild(btn);
    return btn;
  });

  function select(i) {
    const src = items[i];
    main.innerHTML = isVideoFile(src)
      ? `<video src="${src}" autoplay muted loop playsinline controls></video>`
      : `<img src="${src}" alt="">`;
    thumbs.forEach((t, k) => t.classList.toggle('on', k === i));
    // 선택한 썸네일이 목록 밖에 있으면 목록만 살짝 스크롤
    const t = thumbs[i];
    if (t.offsetTop < scroll.scrollTop || t.offsetTop + t.offsetHeight > scroll.scrollTop + scroll.clientHeight) {
      scroll.scrollTo({ top: t.offsetTop - 8, behavior: 'smooth' });
    }
  }
  select(0);
}

// 페이지를 떠나면 미리보기 동영상 정지, 돌아오면 다시 재생
function pausePreview(body) { body.querySelectorAll('.preview-main video').forEach(v => v.pause()); }
function resumePreview(body) { body.querySelectorAll('.preview-main video').forEach(v => v.play().catch(() => {})); }

// PDF → 페이지 바로 보이게 렌더링 (pdf.js)
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function loadPdf(el) {
  if (el.dataset.loaded) return;
  el.dataset.loaded = '1';
  const src = el.dataset.src;
  // PDF가 없으면 'Design Document' 제목까지 같이 숨김
  if (!src) { (el.closest('.block') || el).remove(); return; }
  const fileName = el.dataset.download || src.split('/').pop();

  el.innerHTML = `
    <div class="pdf-bar">
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
const ROLE_SCALE = 0.5;
function fitLogo() {
  const main = document.querySelector('.name-main');
  const role = document.querySelector('.name-role');
  if (!main || !role) return;
  role.style.fontSize = '';
  // 'Level Design' 부분만 재기 위해 잠깐 'Portfolio' 앞 글자만 남김
  const html = role.innerHTML;
  role.textContent = role.textContent.split('Portfolio')[0];
  // 띄어쓰기를 넓혀도 글자 크기는 변하지 않도록, 잴 때만 'NAHEE KWON'과 같은 띄어쓰기로 잼
  role.style.wordSpacing = 'inherit';
  const size = parseFloat(getComputedStyle(role).fontSize);
  const ratio = main.getBoundingClientRect().width / role.getBoundingClientRect().width;
  role.style.wordSpacing = '';
  role.innerHTML = html;
  role.style.fontSize = Math.floor(size * ratio * ROLE_SCALE * 2) / 2 + 'px';
}
document.fonts.ready.then(fitLogo);
window.addEventListener('resize', fitLogo);

// 프로젝트 페이지 태그: 맨 앞 '#'만 따로 감싸서 기울임 적용 (index.html에는 '#잠입'처럼 그대로 적으면 됨)
document.querySelectorAll('.section .tags li').forEach(li => {
  const text = li.textContent.trim();
  if (!text.startsWith('#')) return;
  li.innerHTML = '<span class="hash">#</span>';
  li.append(text.slice(1));
});

// 메인 썸네일: 자동으로 순서대로 전환, 메뉴에 마우스를 올리면 해당 썸네일 표시
const thumbLinks = [...document.querySelectorAll('.nav a[data-thumb]')];
const showcase = document.querySelector('.showcase');

if (showcase && thumbLinks.length) {
  const frame = showcase.querySelector('.showcase-frame');
  const label = showcase.querySelector('.label');
  const title = showcase.querySelector('.showcase-title');
  const tags = showcase.querySelector('.showcase-tags');
  // data-video가 있으면 동영상(소리 없이 반복 재생), 없으면 이미지
  const imgs = thumbLinks.map(a => {
    let el;
    if (a.dataset.video) {
      el = document.createElement('video');
      el.src = a.dataset.video;
      el.poster = a.dataset.thumb;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = 'none';  // 동영상이 3개라서, 화면에 보일 차례가 될 때 불러옴
    } else {
      el = new Image();
      el.src = a.dataset.thumb;
      el.alt = a.dataset.title || a.textContent;
    }
    frame.appendChild(el);
    return el;
  });
  let current = 0;
  let timer;

  function show(i) {
    current = i;
    imgs.forEach((el, k) => {
      el.classList.toggle('on', k === i);
      // 동영상은 보일 때만 재생 (가려지면 멈췄다가 다시 보이면 이어서 재생)
      if (el.tagName === 'VIDEO') {
        if (k === i && !showcase.closest('section').hidden) el.play().catch(() => {});
        else el.pause();
      }
    });
    const a = thumbLinks[i];
    showcase.setAttribute('href', a.getAttribute('href'));
    // data-kind가 있으면 '제목 | 분류', 없으면 'PROJECT 00 제목'
    const kind = a.dataset.kind;
    label.textContent = kind ? '|  ' + kind : 'Project '+ String(i + 1).padStart(2, '0');
    label.parentElement.classList.toggle('has-kind', !!kind);
    title.textContent = a.dataset.title || a.textContent;
    tags.innerHTML = '';
    (a.dataset.tags || '').split(',').filter(t => t.trim()).forEach(t => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="hash">#</span>';
      li.append(t.trim());
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
    if (p !== current && !p.hidden) {
      p.querySelectorAll('.video').forEach(stopVideo);
      p.querySelectorAll('.preview-body').forEach(pausePreview);
    }
    p.hidden = p !== current;
  });
  links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));

  // 홈 썸네일 동영상: 홈에 있을 때만 재생
  document.querySelectorAll('.showcase-frame video').forEach(v => {
    if (!current.contains(v)) v.pause();
    else if (v.classList.contains('on')) v.play().catch(() => {});
  });

  current.querySelectorAll('.preview-body').forEach(b => { loadPreview(b); resumePreview(b); });
  current.querySelectorAll('.video').forEach(loadVideo);
  current.querySelectorAll('.pdf').forEach(loadPdf);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', route);
route();
