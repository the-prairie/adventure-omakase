'use strict';

/* Native form values, with one keyboard-accessible presentation across browsers.
   Popovers enter the top layer, including inside the app's modal dialog. */
(() => {
  if (!('showPopover' in HTMLElement.prototype)) return;
  const widgets = new WeakMap();
  let openWidget = null;
  let sequence = 0;
  const chevron =
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg>';

  function enhance(root) {
    const selects = root.matches?.('select')
      ? [root]
      : root.querySelectorAll?.('select') || [];
    for (const select of selects) {
      if (widgets.has(select) || select.multiple || select.size > 1) continue;
      const key = `choice-${++sequence}`;
      const wrap = document.createElement('span');
      wrap.className = 'choice';
      select.before(wrap);
      wrap.append(select);
      select.classList.add('choice-native');
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'choice-trigger';
      trigger.id = `${key}-trigger`;
      trigger.setAttribute('role', 'combobox');
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', `${key}-list`);
      trigger.innerHTML = `<span id="${key}-value"></span>${chevron}`;
      const value = trigger.firstElementChild;
      const labels = [...select.labels];
      labels.forEach((label, index) => {
        label.id ||= `${key}-label-${index}`;
      });
      const name = labels.map((label) => label.id).join(' ');
      if (name) trigger.setAttribute('aria-labelledby', name);
      else
        trigger.setAttribute(
          'aria-label',
          select.getAttribute('aria-label') ||
            select.name ||
            'Choose an option',
        );
      const list = document.createElement('div');
      list.className = 'choice-list';
      list.id = `${key}-list`;
      list.setAttribute('role', 'listbox');
      list.setAttribute('popover', 'auto');
      if (name) list.setAttribute('aria-labelledby', name);
      else list.setAttribute('aria-label', trigger.getAttribute('aria-label'));
      wrap.append(trigger, list);
      let active = -1,
        search = '',
        searchTime = 0;

      function sync() {
        value.textContent =
          select.selectedOptions[0]?.label || 'Choose an option';
        trigger.disabled = select.disabled;
        trigger.setAttribute('aria-required', String(select.required));
        if (list.matches(':popover-open')) paint();
      }
      function options() {
        return [...select.options];
      }
      function paint() {
        list.replaceChildren(
          ...options().map((option, index) => {
            const item = document.createElement('div');
            item.id = `${key}-option-${index}`;
            item.className = 'choice-option';
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(option.selected));
            item.setAttribute('aria-disabled', String(option.disabled));
            item.dataset.index = index;
            item.textContent = option.label;
            return item;
          }),
        );
        highlight(active);
      }
      function highlight(index) {
        active = index;
        for (const item of list.children)
          item.classList.toggle(
            'active',
            Number(item.dataset.index) === active,
          );
        const item = list.children[active];
        if (item) {
          trigger.setAttribute('aria-activedescendant', item.id);
          // Keep keyboard highlighting within the popup. scrollIntoView also
          // scrolls the containing dialog, which dismisses the new popup.
          if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
          else if (
            item.offsetTop + item.offsetHeight >
            list.scrollTop + list.clientHeight
          )
            list.scrollTop =
              item.offsetTop + item.offsetHeight - list.clientHeight;
        } else trigger.removeAttribute('aria-activedescendant');
      }
      function position() {
        const rect = trigger.getBoundingClientRect();
        const height = window.innerHeight,
          width = window.innerWidth;
        const above = rect.top - 12,
          below = height - rect.bottom - 12;
        const up = below < 200 && above > below;
        const maxHeight = Math.max(80, Math.min(320, up ? above : below));
        list.style.width = `${Math.min(width - 24, Math.max(rect.width, 240))}px`;
        list.style.maxHeight = `${maxHeight}px`;
        list.style.left = `${Math.max(12, Math.min(rect.left, width - list.offsetWidth - 12))}px`;
        list.style.top = `${up ? Math.max(12, rect.top - list.offsetHeight - 6) : rect.bottom + 6}px`;
      }
      function close() {
        if (list.matches(':popover-open')) list.hidePopover();
        trigger.setAttribute('aria-expanded', 'false');
        trigger.removeAttribute('aria-activedescendant');
        if (openWidget === widget) openWidget = null;
      }
      function open() {
        if (trigger.disabled) return;
        openWidget?.close();
        trigger.focus({ preventScroll: true });
        active = select.selectedIndex;
        paint();
        list.showPopover();
        trigger.setAttribute('aria-expanded', 'true');
        openWidget = widget;
        position();
        highlight(active);
      }
      function choose(index) {
        const option = select.options[index];
        if (!option || option.disabled) return;
        select.selectedIndex = index;
        close();
        sync();
        trigger.focus({ preventScroll: true });
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const widget = { sync, close, wrap, list, position, trigger };
      widgets.set(select, widget);
      trigger.addEventListener('click', () =>
        list.matches(':popover-open') ? close() : open(),
      );
      trigger.addEventListener('keydown', (event) => {
        const shown = list.matches(':popover-open');
        if (event.key === 'Escape' && shown) {
          event.preventDefault();
          event.stopPropagation();
          close();
          return;
        }
        if (event.key === 'Tab') {
          close();
          return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (!shown) open();
          const available = options()
            .map((o, i) => (o.disabled ? -1 : i))
            .filter((i) => i >= 0);
          const at = available.indexOf(active);
          const next =
            event.key === 'Home'
              ? available[0]
              : event.key === 'End'
                ? available.at(-1)
                : available[
                    Math.max(
                      0,
                      Math.min(
                        available.length - 1,
                        at + (event.key === 'ArrowDown' ? 1 : -1),
                      ),
                    )
                  ];
          highlight(next ?? -1);
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (shown) choose(active);
          else open();
          return;
        }
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          event.preventDefault();
          search =
            Date.now() - searchTime > 700 ? event.key : search + event.key;
          searchTime = Date.now();
          if (!shown) open();
          const index = options().findIndex(
            (o) =>
              !o.disabled &&
              o.label
                .toLocaleLowerCase()
                .startsWith(search.toLocaleLowerCase()),
          );
          if (index >= 0) highlight(index);
        }
      });
      list.addEventListener('pointerdown', (event) => event.preventDefault());
      list.addEventListener('click', (event) => {
        const item = event.target.closest('[role=option]');
        if (item) choose(Number(item.dataset.index));
      });
      list.addEventListener('toggle', () => {
        const shown = list.matches(':popover-open');
        trigger.setAttribute('aria-expanded', String(shown));
        if (!shown) {
          trigger.removeAttribute('aria-activedescendant');
          if (openWidget === widget) openWidget = null;
        }
      });
      select.addEventListener('focus', () => trigger.focus());
      select.addEventListener('invalid', () => {
        trigger.setAttribute('aria-invalid', 'true');
        trigger.focus();
      });
      select.addEventListener('change', () => {
        trigger.removeAttribute('aria-invalid');
        sync();
      });
      sync();
    }
  }
  enhance(document);
  new MutationObserver((records) => {
    if (openWidget && !openWidget.wrap.isConnected) openWidget.close();
    for (const record of records) {
      const select = record.target.closest?.('select');
      if (select) widgets.get(select)?.sync();
      for (const node of record.addedNodes)
        if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'required'],
  });
  window.addEventListener('resize', () => openWidget?.position());
  document.addEventListener(
    'scroll',
    (event) => {
      if (openWidget && !openWidget.list.contains(event.target)) {
        // A trigger can scroll into view immediately before its click opens
        // the menu. Follow the anchor instead of dismissing that fresh menu.
        const rect = openWidget.trigger.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight)
          openWidget.close();
        else openWidget.position();
      }
    },
    true,
  );
  document.addEventListener('reset', () =>
    setTimeout(() => {
      document
        .querySelectorAll('select')
        .forEach((select) => widgets.get(select)?.sync());
    }, 0),
  );
})();
