import { ref } from 'vue';
import { showToast } from 'vant';

// ============================================================
// Mock ASR：先返回固定文字，后续替换为百度/讯飞/阿里真实 API
// ============================================================
async function mockASR(_blob: Blob): Promise<string> {
  // TODO: 替换为真实 ASR API 调用
  // 示例：POST https://vop.baidu.com/server_api 或 讯飞 WebSocket API
  await new Promise((r) => setTimeout(r, 800)); // 模拟网络延迟
  const mockResults = ['血常规分析仪', '酒精', '双面胶', '打印纸', '扭矩扳手'];
  return mockResults[Math.floor(Math.random() * mockResults.length)];
}

// ============================================================
// 状态类型
// ============================================================
export type VoiceState = 'idle' | 'recording' | 'processing' | 'error';

export function useVoiceSearch() {
  const voiceState = ref<VoiceState>('idle');
  const volumeLevel = ref(0); // 0-100，用于波形动画

  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let animationTimer: ReturnType<typeof setInterval> | null = null;
  let stream: MediaStream | null = null;

  /** 开始录音（长按触发） */
  async function startRecording(): Promise<void> {
    if (voiceState.value !== 'idle') return;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      showToast('请允许麦克风权限');
      voiceState.value = 'error';
      return;
    }

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.start(100); // 每 100ms 收一段数据
    voiceState.value = 'recording';

    // 模拟音量波形动画
    animationTimer = setInterval(() => {
      volumeLevel.value = Math.floor(Math.random() * 60 + 20);
    }, 150);
  }

  /**
   * 停止录音并返回识别文字（松开触发）
   * @returns 识别到的文字，失败返回空字符串
   */
  async function stopRecording(): Promise<string> {
    if (voiceState.value !== 'recording' || !mediaRecorder) return '';

    // 停止波形动画
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }
    volumeLevel.value = 0;

    // 停止录音，等待数据收集完毕
    await new Promise<void>((resolve) => {
      mediaRecorder!.onstop = () => resolve();
      mediaRecorder!.stop();
    });

    // 释放麦克风
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;

    if (audioChunks.length === 0) {
      voiceState.value = 'idle';
      return '';
    }

    voiceState.value = 'processing';
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

    try {
      const text = await mockASR(audioBlob);
      voiceState.value = 'idle';
      return text;
    } catch {
      showToast('语音识别失败，请重试');
      voiceState.value = 'error';
      setTimeout(() => { voiceState.value = 'idle'; }, 1500);
      return '';
    }
  }

  /** 取消录音 */
  function cancelRecording(): void {
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }
    mediaRecorder?.stop();
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    audioChunks = [];
    volumeLevel.value = 0;
    voiceState.value = 'idle';
  }

  return { voiceState, volumeLevel, startRecording, stopRecording, cancelRecording };
}
