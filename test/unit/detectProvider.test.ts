import * as assert from 'node:assert/strict';

import { detectProvider } from '../../src/core/web/detectProvider';

suite('detectProvider', () => {
  test('三個公開主機', () => {
    assert.equal(detectProvider('github.com', {}), 'github');
    assert.equal(detectProvider('gitlab.com', {}), 'gitlab');
    assert.equal(detectProvider('bitbucket.org', {}), 'bitbucket');
  });

  test('設定覆寫優先', () => {
    assert.equal(detectProvider('git.example.com', { 'git.example.com': 'gitlab' }), 'gitlab');
    assert.equal(detectProvider('github.com', { 'github.com': 'gitlab' }), 'gitlab');
  });

  test('自架站靠 hostname 字樣猜', () => {
    assert.equal(detectProvider('gitlab.company.com', {}), 'gitlab');
    assert.equal(detectProvider('github.internal', {}), 'github');
  });

  test('大小寫不敏感', () => {
    assert.equal(detectProvider('GitHub.com', {}), 'github');
    assert.equal(detectProvider('git.example.com', { 'Git.Example.com': 'bitbucket' }), 'bitbucket');
  });

  test('未知主機回 null', () => {
    assert.equal(detectProvider('git.example.com', {}), null);
  });

  test('設定值不是三者之一時忽略', () => {
    assert.equal(detectProvider('git.example.com', { 'git.example.com': 'gitea' }), null);
  });
});
