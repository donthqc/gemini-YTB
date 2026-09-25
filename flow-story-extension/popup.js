document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleApiKeyBtn = document.getElementById('toggleApiKey');
  const storyInput = document.getElementById('storyText');
  const charCountEl = document.getElementById('charCount');
  const styleSelect = document.getElementById('visualStyle');
  const delayInput = document.getElementById('delaySec');
  const btnGenerate = document.getElementById('btnGeneratePrompts');
  const btnRun = document.getElementById('btnRunBatch');
  const statusBox = document.getElementById('status');
  const sceneContainer = document.getElementById('sceneContainer');
  const sceneList = document.getElementById('sceneList');
  const sceneCount = document.getElementById('sceneCount');
  const characterDnaBox = document.getElementById('characterDnaBox');

  let currentParsedData = null;

  // Tải lại API key đã lưu nếu có trong storage
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const saved = await chrome.storage.local.get(['gemini_api_key']);
      if (saved.gemini_api_key) apiKeyInput.value = saved.gemini_api_key;
    }
  } catch (e) {
    console.log('Running in standalone mode');
  }

  // Toggle ẩn/hiện API Key
  toggleApiKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleApiKeyBtn.style.color = '#38bdf8';
    } else {
      apiKeyInput.type = 'password';
      toggleApiKeyBtn.style.color = '#64748b';
    }
  });

  // Đếm từ theo thời gian thực
  storyInput.addEventListener('input', () => {
    const text = storyInput.value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    charCountEl.textContent = `${count} từ`;
  });

  function showStatus(msg, type = 'info') {
    statusBox.textContent = msg;
    statusBox.className = 'status-box';
    if (type === 'error') {
      statusBox.style.borderColor = '#f87171';
      statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
      statusBox.style.color = '#fca5a5';
    } else if (type === 'success') {
      statusBox.style.borderColor = '#4ade80';
      statusBox.style.background = 'rgba(34, 197, 94, 0.15)';
      statusBox.style.color = '#86efac';
    } else {
      statusBox.style.borderColor = '#38bdf8';
      statusBox.style.background = 'rgba(56, 189, 248, 0.15)';
      statusBox.style.color = '#bae6fd';
    }
    statusBox.classList.remove('hidden');
  }

  // 1. Phân tách kịch bản thành Prompt bằng Gemini API
  btnGenerate.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const story = storyInput.value.trim();
    const style = styleSelect.value;

    if (!apiKey) return alert('Vui lòng nhập Gemini API Key!');
    if (!story) return alert('Vui lòng nhập nội dung câu chuyện/kịch bản!');

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ gemini_api_key: apiKey });
    }

    showStatus('⏳ Đang phân tích kịch bản và trích xuất đặc điểm nhân vật...', 'info');
    btnGenerate.disabled = true;

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const systemInstruction = `Bạn là đạo diễn hình ảnh và chuyên gia viết prompt cho Google Flow (Nano Banana & Veo).
Nhiệm vụ: Nhận một câu chuyện dài và phân tách thành danh sách các cảnh tuần tự.
YÊU CẦU BẮT BUỘC:
1. Xác định nhân vật chính và tạo ra một đoạn "character_dna" ngắn gọn (tuổi, đặc điểm gương mặt, kiểu tóc, trang phục đồng nhất).
2. Từng phân cảnh (scenes) phải chứa prompt chi tiết bằng TIẾNG ANH (vì AI sinh ảnh/video hiểu tốt nhất tiếng Anh), lồng ghép đặc điểm nhân vật và phong cách: ${style}.
3. Mỗi cảnh phải có "motion_prompt" cho video.
4. Trả về ĐÚNG định dạng JSON sau:
{
  "character_dna": "chuỗi mô tả nhân vật",
  "scenes": [
    {
      "scene_index": 1,
      "story_beat": "mô tả cảnh ngắn bằng tiếng Việt",
      "image_prompt": "prompt tiếng Anh đầy đủ cho ảnh",
      "motion_prompt": "prompt tiếng Anh chuyển động cho Veo"
    }
  ]
}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\nNỘI DUNG TRUYỆN:\n${story}` }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Lỗi gọi API');

      const contentText = data.candidates[0].content.parts[0].text;
      currentParsedData = JSON.parse(contentText);

      // Hiển thị giao diện danh sách phân cảnh
      characterDnaBox.innerHTML = `<strong>👤 Nhân vật đồng nhất:</strong> ${currentParsedData.character_dna}`;
      sceneCount.textContent = currentParsedData.scenes.length;
      sceneList.innerHTML = '';

      currentParsedData.scenes.forEach(sc => {
        const item = document.createElement('div');
        item.className = 'scene-item';
        item.innerHTML = `
          <div class="scene-item-title">
            <span>Cảnh ${sc.scene_index}: ${sc.story_beat}</span>
            <span class="tag">Shot ${sc.scene_index}</span>
          </div>
          <div class="scene-field image-field">
            <strong>🖼️ Ảnh:</strong> ${sc.image_prompt}
          </div>
          <div class="scene-field motion-field">
            <strong>🎥 Video:</strong> ${sc.motion_prompt}
          </div>
        `;
        sceneList.appendChild(item);
      });

      sceneContainer.classList.remove('hidden');
      showStatus(`✅ Đã phân tách thành công ${currentParsedData.scenes.length} cảnh! Bạn có thể bắt đầu chạy.`, 'success');

    } catch (err) {
      showStatus(`❌ Lỗi: ${err.message}`, 'error');
    } finally {
      btnGenerate.disabled = false;
    }
  });

  // 2. Gửi danh sách phân cảnh sang tab Google Flow để chạy tự động
  btnRun.addEventListener('click', async () => {
    if (!currentParsedData || !currentParsedData.scenes.length) return;

    if (typeof chrome === 'undefined' || !chrome.tabs) {
      return alert('Chức năng này cần được chạy bên trong tiện ích mở rộng Chrome!');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('flow.google.com')) {
      return alert('Vui lòng mở trang web Google Flow (flow.google.com) trên tab hiện tại trước khi bấm chạy!');
    }

    const delay = parseInt(delayInput.value) || 8;
    showStatus('🚀 Đang gửi dữ liệu sang Google Flow để thực thi...', 'info');

    chrome.tabs.sendMessage(tab.id, {
      action: 'START_BATCH',
      scenes: currentParsedData.scenes,
      delaySeconds: delay
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Chưa kết nối được với tab Google Flow. Hãy tải lại (F5) trang flow.google.com rồi thử lại!', 'error');
      } else {
        showStatus('⚡ Đang tự động bơm prompt vào Google Flow...', 'success');
      }
    });
  });
});
