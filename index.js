import { createDeletionController } from './delete-controller.js';

let observer;
let frame;
let generating = false;
let started = false;
let chatElement;
const subscriptions = [];
const context = () => SillyTavern.getContext();

function notify(message, type) {
    if (window.toastr?.[type]) window.toastr[type](message, '快捷删除');
    else console.warn('[QuickDelete]', message);
}

function isGenerating() {
    const processor = context().streamingProcessor;
    const stopButton = document.querySelector('#mes_stop');
    return generating || (processor && !processor.isFinished) ||
        Boolean(stopButton && stopButton.getClientRects().length && getComputedStyle(stopButton).display !== 'none');
}

async function confirmDelete(id, message) {
    const text = document.createElement('div');
    const title = document.createElement('p');
    title.textContent = `删除第 ${id} 楼（${message.name || (message.is_user ? '用户' : 'AI')}）？`;
    const preview = document.createElement('pre');
    preview.className = 'qd-preview';
    preview.textContent = String(message.mes || '').slice(0, 240) || '（空消息）';
    const note = document.createElement('p');
    note.textContent = '仅删除这一楼及其备选回复，后续消息保留。此操作不能在本插件内撤销。';
    text.append(title, preview, note);
    const ctx = context();
    if (ctx.callGenericPopup && ctx.POPUP_TYPE) {
        const result = await ctx.callGenericPopup(text, ctx.POPUP_TYPE.CONFIRM, '', {
            okButton: '删除本条', cancelButton: '取消',
        });
        return result === ctx.POPUP_RESULT.AFFIRMATIVE;
    }
    return window.confirm(`${title.textContent}\n\n${preview.textContent}\n\n${note.textContent}`);
}

const deleteOne = createDeletionController({
    getContext: context,
    getHelper: () => window.TavernHelper,
    isGenerating,
    confirm: confirmDelete,
    notify,
});

function addButtons() {
    frame = undefined;
    if (!started || !chatElement) return;
    for (const message of chatElement.querySelectorAll(':scope > .mes[mesid]')) {
        const block = message.querySelector('.mes_block');
        if (!block || block.querySelector(':scope > .qd-bar')) continue;
        const bar = document.createElement('div');
        bar.className = 'qd-bar';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'qd-delete';
        button.title = '只删除这一条消息，保留后面的消息';
        button.setAttribute('aria-label', '删除本条消息');
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-trash-can';
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.textContent = '删除本条';
        button.append(icon, label);
        bar.append(button);
        // Outside .mes_text: rendered HTML/iframes do not replace this control.
        const text = block.querySelector(':scope > .mes_text');
        if (text) block.insertBefore(bar, text);
        else block.append(bar);
    }
}

function scheduleButtons() {
    if (frame === undefined && started) frame = requestAnimationFrame(addButtons);
}

async function onClick(event) {
    const button = event.target.closest?.('.qd-delete');
    if (!button || !chatElement.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    const message = button.closest('.mes[mesid]');
    const rawId = message?.getAttribute('mesid');
    if (!/^\d+$/.test(rawId || '')) return;
    button.disabled = true;
    try { await deleteOne(Number(rawId)); }
    finally { button.disabled = false; scheduleButtons(); }
}

export function onEnable() {
    if (started) return;
    chatElement = document.querySelector('#chat');
    if (!chatElement) return;
    started = true;
    chatElement.addEventListener('click', onClick);
    observer = new MutationObserver(scheduleButtons);
    observer.observe(chatElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['mesid'] });
    const { eventSource, eventTypes } = context();
    const listen = (name, callback) => {
        if (!eventTypes?.[name]) return;
        eventSource.on(eventTypes[name], callback);
        subscriptions.push([eventTypes[name], callback]);
    };
    listen('GENERATION_STARTED', (_type, _options, dryRun) => { if (!dryRun) generating = true; });
    listen('GENERATION_ENDED', () => { generating = false; });
    listen('GENERATION_STOPPED', () => { generating = false; });
    addButtons();
}

export function onDisable() {
    started = false;
    observer?.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    chatElement?.removeEventListener('click', onClick);
    for (const [event, callback] of subscriptions.splice(0)) context().eventSource.removeListener(event, callback);
    document.querySelectorAll('.qd-bar').forEach(element => element.remove());
    generating = false;
}

// jQuery is part of SillyTavern; ready also handles scripts loaded after DOMContentLoaded.
$(onEnable);
