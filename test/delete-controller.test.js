import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeletionController } from '../delete-controller.js';

function fixture() {
    let ctx = { chat: [{ mes: 'first' }, { mes: 'middle' }, { mes: 'last' }], getCurrentChatId: () => 'chat-a' };
    let generating = false;
    let confirmation = async () => true;
    const calls = [];
    const notices = [];
    let helper = { deleteChatMessages: async (ids, options) => {
        calls.push({ ids, options });
        ctx.chat.splice(ids[0], 1);
    } };
    return {
        delete: createDeletionController({ getContext: () => ctx, getHelper: () => helper,
            isGenerating: () => generating, confirm: (...args) => confirmation(...args),
            notify: (...args) => notices.push(args) }),
        calls, notices, get ctx() { return ctx; },
        setContext: value => { ctx = value; },
        setGenerating: value => { generating = value; },
        setConfirm: value => { confirmation = value; },
        setHelper: value => { helper = value; },
    };
}

test('deletes exactly the middle message and preserves surrounding messages', async () => {
    const f = fixture();
    assert.equal(await f.delete(1), true);
    assert.deepEqual(f.ctx.chat.map(m => m.mes), ['first', 'last']);
    assert.deepEqual(f.calls, [{ ids: [1], options: { refresh: 'affected' } }]);
});
test('allows deleting message zero and the last message', async () => {
    for (const id of [0, 2]) {
        const f = fixture();
        assert.equal(await f.delete(id), true);
        assert.deepEqual(f.calls[0].ids, [id]);
    }
});
test('rejects invalid IDs without calling helper', async () => {
    const f = fixture();
    for (const id of [-1, 3, NaN, Infinity, 1.5, '1']) assert.equal(await f.delete(id), false);
    assert.equal(f.calls.length, 0);
});
test('cancel and missing helper preserve all messages', async () => {
    const f = fixture();
    f.setConfirm(async () => false);
    assert.equal(await f.delete(1), false);
    f.setHelper(undefined);
    assert.equal(await f.delete(1), false);
    assert.equal(f.calls.length, 0);
});
test('blocks generation both before and after confirmation', async () => {
    const f = fixture();
    f.setGenerating(true);
    assert.equal(await f.delete(1), false);
    f.setGenerating(false);
    f.setConfirm(async () => { f.setGenerating(true); return true; });
    assert.equal(await f.delete(1), false);
    assert.equal(f.calls.length, 0);
});
test('switching chats during confirmation does not delete from either chat', async () => {
    const f = fixture();
    const original = f.ctx.chat;
    f.setConfirm(async () => { f.setContext({ chat: [{ mes: 'other' }], getCurrentChatId: () => 'chat-b' }); return true; });
    assert.equal(await f.delete(1), false);
    assert.equal(original.length, 3);
    assert.equal(f.ctx.chat.length, 1);
    assert.equal(f.calls.length, 0);
});
test('renumbered/replaced target aborts instead of deleting the wrong message', async () => {
    const f = fixture();
    f.setConfirm(async () => { f.ctx.chat.shift(); return true; });
    assert.equal(await f.delete(1), false);
    assert.equal(f.calls.length, 0);
});
test('rapid second click is ignored while confirmation is pending', async () => {
    const f = fixture();
    let resolve;
    f.setConfirm(() => new Promise(r => { resolve = r; }));
    const first = f.delete(1);
    assert.equal(await f.delete(2), false);
    resolve(true);
    assert.equal(await first, true);
    assert.equal(f.calls.length, 1);
});
test('helper failures release the lock and report failure', async () => {
    const f = fixture();
    f.setHelper({ deleteChatMessages: async () => { throw new Error('test failure'); } });
    assert.equal(await f.delete(1), false);
    f.setHelper({ deleteChatMessages: async () => {} });
    assert.equal(await f.delete(1), true);
    assert.equal(f.notices[0][1], 'error');
});
