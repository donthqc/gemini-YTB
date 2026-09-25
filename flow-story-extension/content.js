console.log('[FlowStory AI] Content script đã sẵn sàng trên Google Flow.');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_BATCH') {
    executeBatch(request.scenes, request.delaySeconds);
    sendResponse({ status: 'started' });
  }
});

async function executeBatch(scenes, delaySeconds) {
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`[FlowStory AI] Đang chạy Cảnh ${scene.scene_index}/${scenes.length}`);

    const success = await injectPromptToFlow(scene.image_prompt);
    if (!success) {
      console.warn(`[FlowStory AI] Không tìm thấy ô nhập prompt ở cảnh ${scene.scene_index}`);
    }

    await new Promise(r => setTimeout(r, delaySeconds * 1000));
  }
  alert('[FlowStory AI] Đã hoàn thành quá trình nạp toàn bộ danh sách prompt!');
}

async function injectPromptToFlow(text) {
  const inputEl = document.querySelector('textarea, div[contenteditable="true"], input[type="text"]');
  if (!inputEl) return false;

  inputEl.focus();
  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    inputEl.value = text;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    inputEl.innerText = text;
    inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }

  await new Promise(r => setTimeout(r, 600));

  const sendBtn = document.querySelector('button[aria-label*="Generate"], button[aria-label*="Send"], button[type="submit"]');
  if (sendBtn && !sendBtn.disabled) {
    sendBtn.click();
  } else {
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  }

  return true;
}
