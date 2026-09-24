import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

export class VRMViewer {
  constructor(container) {
    if (!container) throw new Error("Canvas container not found!");

    this.container = container;
    this.currentVrm = null;
    this.lastTime = performance.now();

    this.blinkTimer = 0;
    this.blinkInterval = 3.0;

    this.isSpeaking = false;
    this.speakDuration = 0;
    this.speakElapsed = 0;
    this.currentEmotion = 'relaxed';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20.0);
    this.camera.position.set(0.0, 1.3, 1.15);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(1.0, 1.0, 1.0).normalize();
    this.scene.add(dirLight);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    // 디버깅 및 직접 테스트를 위해 전역 window 객체에 등록
    window.vrmViewerInstance = this;

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  loadModel(url) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      loader.load(
        url,
        (gltf) => {
          const loadedVrm = gltf.userData.vrm;
          if (!loadedVrm) return reject(new Error("VRM 데이터를 찾을 수 없습니다."));

          if (VRMUtils?.combineSkeletons) VRMUtils.combineSkeletons(gltf.scene);

          if (this.currentVrm) {
            this.scene.remove(this.currentVrm.scene);
            if (VRMUtils?.deepDispose) VRMUtils.deepDispose(this.currentVrm.scene);
          }

          this.currentVrm = loadedVrm;
          this.scene.add(loadedVrm.scene);
          loadedVrm.scene.rotation.y = 0;

          if (loadedVrm.humanoid) {
            const leftArm = loadedVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
            const rightArm = loadedVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
            if (leftArm) leftArm.rotation.z = -1.25;
            if (rightArm) rightArm.rotation.z = 1.25;
          }

          if (loadedVrm.expressionManager) {
            const names = loadedVrm.expressionManager.expressions.map(e => e.expressionName);
            console.log("지원되는 표정 목록:", names);
          }

          resolve(loadedVrm);
        },
        undefined,
        reject
      );
    });
  }

  applyExpressionWeight(name, value) {
    if (!this.currentVrm?.expressionManager) return;
    try {
      this.currentVrm.expressionManager.setValue(name, value);
      // 값 설정 즉시 업데이트 반영
      this.currentVrm.expressionManager.update();
    } catch (e) {
      console.warn("Expression error:", name, e);
    }
  }

  setExpression(emotion) {
    if (!this.currentVrm?.expressionManager) return;
    this.currentEmotion = emotion;

    ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral'].forEach(name => {
      this.applyExpressionWeight(name, 0);
    });

    const validEmotion = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral'].includes(emotion)
      ? emotion
      : 'relaxed';

    this.applyExpressionWeight(validEmotion, 0.5);
  }

  speak(textLength, emotion = 'relaxed') {
    console.log(`[speak 호출됨] 글자수: ${textLength}, 감정: ${emotion}`);
    this.setExpression(emotion);
    this.speakDuration = Math.min(Math.max(textLength * 0.1, 2.0), 6.0);
    this.speakElapsed = 0;
    this.isSpeaking = true;
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const currentTime = performance.now();
    const delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (this.currentVrm) {
      const timeSec = currentTime * 0.001;
      const head = this.currentVrm.humanoid?.getNormalizedBoneNode('head');
      const spine = this.currentVrm.humanoid?.getNormalizedBoneNode('spine');

      // 1. 호흡
      if (spine) {
        spine.rotation.x = Math.sin(timeSec * 1.8) * 0.02;
      }

      // 2. 말하기
      if (this.isSpeaking) {
        this.speakElapsed += delta;

        if (this.speakElapsed < this.speakDuration) {
          // 크고 확실하게 입을 벌리도록 계수 1.0 설정
          const mouthVal = Math.abs(Math.sin(this.speakElapsed * 10.0));
          this.applyExpressionWeight('aa', mouthVal);

          if (head) {
            head.rotation.x = Math.sin(this.speakElapsed * 4.0) * 0.06 + 0.02;
          }
        } else {
          this.isSpeaking = false;
          this.applyExpressionWeight('aa', 0);
          if (head) head.rotation.set(0, 0, 0);

          setTimeout(() => {
            if (!this.isSpeaking) this.setExpression('relaxed');
          }, 1500);
        }
      }

      // 3. 깜빡임
      this.blinkTimer += delta;
      if (this.blinkTimer > this.blinkInterval) {
        const blinkVal = Math.sin((this.blinkTimer - this.blinkInterval) * 8.0);
        if (blinkVal > 0) {
          this.applyExpressionWeight('blink', blinkVal);
        } else {
          this.applyExpressionWeight('blink', 0);
          this.blinkTimer = 0;
          this.blinkInterval = 2.5 + Math.random() * 2.0;
        }
      }

      this.currentVrm.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}