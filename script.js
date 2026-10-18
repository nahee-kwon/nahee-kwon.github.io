// 유튜브 주소 → 임베드
function youtubeId(url) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

document.querySelectorAll('.video').forEach(el => {
  const id = youtubeId(el.dataset.youtube || '');
  if (!id) {
    el.innerHTML = '<div class="placeholder">유튜브 링크를 입력해주세요</div>';
    return;
  }
  el.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}" title="YouTube video"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>`;
});

// PDF → 페이지 바로 보이게 렌더링 (pdf.js)
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

document.querySelectorAll('.pdf').forEach(async el => {
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
});

// 메인 썸네일: 자동으로 순서대로 전환, 메뉴에 마우스를 올리면 해당 썸네일 표시
const thumbLinks = [...document.querySelectorAll('.nav a[data-thumb]')];
const showcase = document.querySelector('.showcase');

if (showcase && thumbLinks.length) {
  const frame = showcase.querySelector('.showcase-frame');
  const label = showcase.querySelector('.label');
  const title = showcase.querySelector('.showcase-title');
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

// 현재 보고 있는 섹션을 메뉴에 표시
const links = document.querySelectorAll('.nav a');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-40% 0px -55% 0px' });

document.querySelectorAll('main section[id]').forEach(s => observer.observe(s));
