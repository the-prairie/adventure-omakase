'use strict';
/* Files stay in memory. Only an explicit read sends them to the private helper. */
window.OmakaseBookings = function ({
  escape: E,
  release,
  getWindows,
  setWindows,
}) {
  let dispose = () => undefined,
    review = () => undefined,
    selectAndRead = () => undefined;
  const labels = {
    tokyo: 'Tokyo',
    osaka: 'Osaka & beyond',
    okinawa: 'Okinawa',
    elsewhere: 'Elsewhere',
  };
  const dateLabel = (value) =>
    value
      ? new Date(value + 'T12:00:00Z').toLocaleDateString('en', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'Asia/Tokyo',
        })
      : '';
  const dates = (w) =>
    `${dateLabel(w.from) || 'Arrival open'} → ${dateLabel(w.to) || 'Departure open'}`;
  const same = (a, b) =>
    ['region', 'area', 'from', 'to'].every(
      (k) => (a[k] || '') === (b[k] || ''),
    );
  function markup(open = true) {
    return `<details class="booking-import" ${open ? 'open' : ''}><summary id="booking-heading">Fill dates from a booking</summary><p>Upload a flight or stay confirmation, or paste a screenshot. Add more whenever your plans change.</p><div class="field"><label for="booking-files">Booking images or PDFs</label><input id="booking-files" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple><small>Up to four files, 4.5 MB total. Photos are resized. Drop files here or paste an image.</small></div><p class="small muted">Read booking sends selected files to Gemini. The app does not store the files; extracted drafts stay private for seven days.</p><div class="row wrap"><button type="button" class="btn subtle" data-booking-read disabled>Read booking</button><button type="button" class="text-btn" data-booking-recent>Recent booking drafts</button><button type="button" class="text-btn" data-booking-cancel hidden>Cancel reading</button></div><p data-booking-status class="small" role="status">No booking selected. Manual dates work just as well.</p><div data-booking-sources></div><div data-booking-results></div></details>`;
  }
  function attach(form) {
    dispose();
    const panel = form.querySelector('.booking-import');
    if (!panel) return;
    const status = panel.querySelector('[data-booking-status]'),
      read = panel.querySelector('[data-booking-read]'),
      cancel = panel.querySelector('[data-booking-cancel]'),
      sources = panel.querySelector('[data-booking-sources]'),
      results = panel.querySelector('[data-booking-results]');
    let files = [],
      urls = [],
      pending = false,
      active = null,
      generation = 0;
    const current = () => form.isConnected;
    async function api(path, method = 'GET', data, signal) {
      const response = await fetch('/api/travel' + path, {
        method,
        credentials: 'same-origin',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(65000)])
          : AbortSignal.timeout(65000),
        headers: {
          'Content-Type': 'application/json',
          'X-Omakase': '1',
          'X-Omakase-Release': release,
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok)
        throw Error(
          body.detail ||
            'The booking could not be read. You can still enter dates yourself.',
        );
      return body;
    }
    function clearFiles() {
      files = [];
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls = [];
      sources.replaceChildren();
    }
    function cancelRead() {
      generation++;
      if (active) {
        const previous = active;
        active = null;
        void api(`/tasks/${previous.id}/cancel`, 'POST', {}).catch(
          () => undefined,
        );
        previous.controller.abort();
      }
      cancel.hidden = true;
      read.disabled = !files.length || pending;
    }
    const observer = new MutationObserver(() => {
      if (!current()) dispose();
    });
    dispose = () => {
      observer.disconnect();
      cancelRead();
      clearFiles();
      form.removeEventListener('paste', paste);
      review = () => undefined;
      selectAndRead = () => undefined;
    };
    observer.observe(document.body, { childList: true, subtree: true });
    const dataURL = (blob) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(
            Error(
              'This file could not be opened. Try a screenshot or another PDF.',
            ),
          );
        reader.readAsDataURL(blob);
      });
    async function prepare(file) {
      if (
        !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(
          file.type,
        )
      )
        throw Error(
          'Choose a PDF, JPEG, PNG or WebP screenshot. Export HEIC photos as JPEG first.',
        );
      if (file.size > 12_000_000)
        throw Error('That file is over 12 MB. Choose a smaller copy.');
      if (file.type === 'application/pdf')
        return { data: await dataURL(file), blob: file };
      const bitmap = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.9),
        );
        if (!blob)
          throw Error(
            'The image could not be prepared. Try another screenshot.',
          );
        return { data: await dataURL(blob), blob };
      } finally {
        bitmap.close();
      }
    }
    async function select(list) {
      cancelRead();
      clearFiles();
      results.replaceChildren();
      const selected = [...list],
        token = ++generation;
      read.disabled = true;
      pending = true;
      status.textContent = 'Preparing the selected files…';
      try {
        if (!selected.length || selected.length > 4)
          throw Error('Choose one to four booking files.');
        const prepared = [];
        for (const file of selected) prepared.push(await prepare(file));
        if (!current() || token !== generation) return;
        if (prepared.reduce((n, f) => n + f.blob.size, 0) > 4_500_000)
          throw Error(
            'These files exceed 4.5 MB. Read fewer documents at a time.',
          );
        files = prepared.map((f) => f.data);
        prepared.forEach((file, i) => {
          const url = URL.createObjectURL(file.blob);
          urls.push(url);
          const details = document.createElement('details'),
            summary = document.createElement('summary');
          summary.textContent = `View document ${i + 1}`;
          details.append(summary);
          if (file.blob.type.startsWith('image/')) {
            const image = document.createElement('img');
            image.src = url;
            image.alt = `Your selected booking, document ${i + 1}`;
            details.append(image);
          } else {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = 'Open selected PDF';
            details.append(link);
          }
          sources.append(details);
        });
        status.textContent = `${files.length} ${files.length === 1 ? 'document' : 'documents'} ready. Nothing has been sent or saved.`;
      } catch (error) {
        if (current() && token === generation)
          status.textContent = error.message;
      } finally {
        if (token === generation) {
          pending = false;
          read.disabled = !files.length;
        }
      }
    }
    function paste(event) {
      const images = [...(event.clipboardData?.files || [])].filter((f) =>
        f.type.startsWith('image/'),
      );
      if (images.length) {
        event.preventDefault();
        void select(images);
      }
    }
    form.addEventListener('paste', paste);
    panel.addEventListener('dragover', (event) => event.preventDefault());
    panel.addEventListener('drop', (event) => {
      event.preventDefault();
      void select(event.dataTransfer.files);
    });
    panel
      .querySelector('#booking-files')
      .addEventListener('change', (event) => void select(event.target.files));
    selectAndRead = async (list) => {
      await select(list);
      if (current() && files.length && !pending) read.click();
    };
    cancel.addEventListener('click', () => {
      cancelRead();
      status.textContent =
        'Reading stopped. Your profile is unchanged; you can enter dates below.';
    });
    function showResult(result) {
      if (!current()) return;
      panel.open = true;
      results.innerHTML = `<h4>Review your dates</h4><p class="small">Check the source, then add or update a window. Save your profile when you’re ready to share.</p>${result.notes ? `<p class="notice">${E(result.notes)}</p>` : ''}`;
      const name = form.querySelector('[name=name]');
      if (result.name && result.name !== name.value) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'text-btn';
        button.textContent = `Use ${result.name} as my display name`;
        button.onclick = () => {
          name.value = result.name;
          button.remove();
        };
        results.append(button);
      }
      if (!result.windows?.length) {
        status.textContent =
          'No clear travel dates were found. Try another document or fill in what you know below.';
        return;
      }
      for (const candidate of result.windows) {
        const row = document.createElement('section');
        row.className = 'booking-proposal';
        const existing = getWindows(),
          exact = existing.some((w) => same(w, candidate));
        row.innerHTML = `<h4>${E(labels[candidate.region])}${candidate.area ? ' · ' + E(candidate.area) : ''}</h4><p class="booking-dates">${E(dates(candidate))}</p><p class="small">Document ${E(candidate.source)} · ${E(candidate.evidence)}</p>${candidate.uncertainty ? `<p class="notice warn">${E(candidate.uncertainty)}</p><label class="booking-confirm"><input type="checkbox" data-booking-checked> I checked this detail against my booking.</label>` : ''}`;
        if (exact) {
          row.insertAdjacentHTML(
            'beforeend',
            '<p class="small">Already in your dates. No duplicate added.</p>',
          );
          results.append(row);
          continue;
        }
        const target = document.createElement('select');
        target.setAttribute('aria-label', 'Where these booking details belong');
        target.innerHTML = `<option value="new">Add another travel window</option>${existing.map((w, i) => `<option value="${i}">Update ${E(labels[w.region])} · ${E(dates(w))}${w.area ? ' · ' + E(w.area) : ''}</option>`).join('')}`;
        const matching = existing
          .map((w, i) => ({ w, i }))
          .filter(
            ({ w }) =>
              w.region === candidate.region &&
              ((w.from && w.from === candidate.from) ||
                (w.to && w.to === candidate.to) ||
                !w.from ||
                !w.to),
          );
        if (matching.length === 1) target.value = String(matching[0].i);
        const explanation = document.createElement('p');
        explanation.className = 'small muted';
        function explain() {
          explanation.textContent =
            target.value === 'new'
              ? 'Adds a window; keeps your existing dates.'
              : 'Updates the shown fields; keeps details missing from the booking.';
        }
        target.addEventListener('change', explain);
        explain();
        const use = document.createElement('button');
        use.type = 'button';
        use.className = 'btn subtle';
        use.textContent = 'Use these details';
        use.disabled = !!candidate.uncertainty;
        row
          .querySelector('[data-booking-checked]')
          ?.addEventListener('change', (event) => {
            use.disabled = !event.target.checked;
          });
        use.onclick = () => {
          const currentWindows = getWindows();
          if (currentWindows.some((w) => same(w, candidate))) {
            status.textContent = 'These dates are already in your form.';
            return;
          }
          const clean = Object.fromEntries(
            ['region', 'area', 'from', 'to'].map((k) => [
              k,
              candidate[k] || '',
            ]),
          );
          if (target.value === 'new') {
            if (currentWindows.length >= 12) {
              status.textContent =
                'You already have twelve travel windows. Update an existing one or remove an unused entry.';
              return;
            }
            currentWindows.push(clean);
          } else {
            const i = Number(target.value);
            if (!currentWindows[i] || !same(currentWindows[i], existing[i])) {
              showResult(result);
              status.textContent =
                'That travel window changed while you were reviewing. The choices now show your latest edits; check before replacing them.';
              return;
            }
            currentWindows[i] = {
              ...currentWindows[i],
              ...Object.fromEntries(Object.entries(clean).filter(([, v]) => v)),
            };
          }
          setWindows(currentWindows);
          use.disabled = true;
          use.textContent = 'Added to your form';
          target.disabled = true;
          status.textContent =
            'Details filled in below. Adjust anything you need, then save your shared profile.';
          form
            .querySelector('#window-list')
            .scrollIntoView({ block: 'nearest', behavior: 'instant' });
        };
        row.append(target, explanation, use);
        results.append(row);
      }
      status.textContent = 'Booking read. Review the suggested changes below.';
    }
    review = showResult;
    read.addEventListener('click', async () => {
      if (!files.length || pending || active) return;
      const token = ++generation,
        controller = new AbortController(),
        id = crypto.randomUUID();
      active = { id, controller };
      read.disabled = true;
      cancel.hidden = false;
      status.textContent =
        'Reading your booking. Your profile stays unchanged until you save.';
      try {
        const response = await api(
          '/tasks',
          'POST',
          { requestId: id, kind: 'profile-import', files },
          controller.signal,
        );
        if (!current() || token !== generation) return;
        if (response.status !== 'complete')
          throw Error('Reading stopped. Your profile is unchanged.');
        showResult(response.result);
      } catch (error) {
        if (current() && token === generation)
          status.textContent =
            error.message +
            ' Your existing details are unchanged; you can keep editing below.';
      } finally {
        if (token === generation) {
          active = null;
          read.disabled = false;
          cancel.hidden = true;
        }
      }
    });
    panel
      .querySelector('[data-booking-recent]')
      .addEventListener('click', async () => {
        cancelRead();
        clearFiles();
        panel.querySelector('#booking-files').value = '';
        read.disabled = true;
        try {
          const response = await api('/tasks');
          if (!current()) return;
          const tasks = response.tasks.filter(
            (task) =>
              task.kind === 'profile-import' && task.status === 'complete',
          );
          results.replaceChildren();
          status.textContent = tasks.length
            ? 'Private drafts from your recent uploads. Original files are not retained.'
            : 'No recent booking drafts. Choose a file or enter your dates below.';
          for (const task of tasks) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn subtle';
            button.textContent = `Review booking · ${new Date(task.created).toLocaleString()}`;
            button.onclick = () => showResult(task.result);
            results.append(button);
          }
        } catch (error) {
          if (current()) status.textContent = error.message;
        }
      });
  }
  return {
    markup,
    attach,
    review: (result) => review(result),
    selectAndRead: (files) => selectAndRead(files),
  };
};
