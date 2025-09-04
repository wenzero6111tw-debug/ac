const $ = (id) => document.getElementById(id);
const state = {
  conf: null,
  step: 0,
  lastStep: 5,
  sel: { role: '', currency: '', category: '', subcategory: '' }
};

function setMsg(text, ok = false) {
  const el = $('msg');
  el.textContent = text || '';
  el.className = 'hint ' + (ok ? 'ok' : 'err');
}

// Generic chip renderer
function renderChips(container, items, selected = '') {
  container.innerHTML = '';
  items.forEach(val => {
    const div = document.createElement('div');
    div.className = 'chip';
    div.textContent = val;
    div.dataset.value = val;
    if (val === selected) div.dataset.selected = '1';
    div.addEventListener('click', () => {
      [...container.children].forEach(c => c.dataset.selected = '0');
      div.dataset.selected = '1';
    }, { passive: true });
    container.appendChild(div);
  });
}

function getSelected(container) {
  const hit = [...container.children].find(c => c.dataset.selected === '1');
  return hit ? hit.dataset.value : '';
}

function showStep(n) {
  state.step = n;
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  const target = document.querySelector(`.step[data-step="${n}"]`);
  if (target) target.classList.remove('hidden');
  $('progress').textContent = `步骤 ${Math.min(n + 1, state.lastStep + 1)} / ${state.lastStep + 1}`;
  $('btnPrev').disabled = (n === 0);
  $('btnNext').textContent = (n === state.lastStep) ? '提交' : '下一步';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(n) {
  if (n === 0) {
    state.sel.role = getSelected($('gridRole'));
    if (!state.sel.role) { setMsg('请选择角色'); return false; }
    return true;
  }
  if (n === 1) {
    state.sel.currency = getSelected($('gridCurrency'));
    if (!state.sel.currency) { setMsg('请选择货币'); return false; }
    return true;
  }
  if (n === 2) {
    state.sel.category = getSelected($('gridCategory'));
    if (!state.sel.category) { setMsg('请选择大类'); return false; }
    return true;
  }
  if (n === 3) {
    state.sel.subcategory = getSelected($('gridSubcategory'));
    if (!state.sel.subcategory) { setMsg('请选择细类'); return false; }
    return true;
  }
  if (n === 4) {
    const a = Number($('amount').value);
    if (!(a > 0)) { setMsg('金额需 > 0'); return false; }
    return true;
  }
  return true;
}

function collectPayload() {
  return {
    role: state.sel.role,
    currency: state.sel.currency,
    category: state.sel.category,
    subcategory: state.sel.subcategory,
    amount: Number($('amount').value),
    note: $('note').value.trim()
  };
}

function submit() {
  const payload = collectPayload();
  $('btnNext').disabled = true; setMsg('');
  google.script.run.withSuccessHandler(res => {
    $('btnNext').disabled = false;
    if (res && res.ok) {
      setMsg(`已记录（行 ${res.row}）`, true);
      $('amount').value = '';
      $('note').value = '';
      showStep(4);
    } else setMsg('提交失败');
  }).withFailureHandler(err => {
    $('btnNext').disabled = false;
    setMsg(err && err.message ? err.message : '提交失败');
  }).recordTxn(payload);
}

// Next/Prev
$('btnNext').addEventListener('click', () => {
  setMsg('');
  if (state.step === state.lastStep) {
    if (validateStep(state.step)) submit();
    return;
  }
  if (validateStep(state.step)) {
    if (state.step === 2) {
      const subs = (state.conf && state.conf.categories[state.sel.category]) || [];
      renderChips($('gridSubcategory'), subs, '');
    }
    showStep(state.step + 1);
  }
});
$('btnPrev').addEventListener('click', () => {
  setMsg('');
  if (state.step > 0) showStep(state.step - 1);
});

// Init
google.script.run.withSuccessHandler(conf => {
  state.conf = conf;
  renderChips($('gridRole'), conf.roles.map(r => r.name), '');
  renderChips($('gridCurrency'), conf.currencies, '');
  renderChips($('gridCategory'), Object.keys(conf.categories), '');
  $('gridSubcategory').innerHTML = '';
  showStep(0);
}).withFailureHandler(err => {
  setMsg(err && err.message ? err.message : '配置加载失败');
}).getConfig();
