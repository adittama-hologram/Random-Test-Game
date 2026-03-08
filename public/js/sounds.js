class SoundManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        this.masterGain.gain.value = 0.5;
        this.bgmOsc = null;
    }

    playClick() {
        this.playTone(440, 'sine', 0.1, 0.2);
    }

    playBounce() {
        this.playTone(150, 'square', 0.1, 0.3);
    }

    playEnd() {
        this.playTone(220, 'sawtooth', 0.5, 0.5);
        setTimeout(() => this.playTone(330, 'sawtooth', 0.5, 0.3), 100);
        setTimeout(() => this.playTone(440, 'sawtooth', 0.8, 0.2), 200);
    }

    startBGM() {
        if (this.bgmOsc) return;
        this.bgmOsc = this.context.createOscillator();
        this.bgmGain = this.context.createGain();
        
        this.bgmOsc.type = 'triangle';
        this.bgmOsc.frequency.setValueAtTime(110, this.context.currentTime);
        this.bgmGain.gain.value = 0.05;

        this.bgmOsc.connect(this.bgmGain);
        this.bgmGain.connect(this.masterGain);
        this.bgmOsc.start();

        // Simple loop melody
        let time = this.context.currentTime;
        const notes = [110, 130, 146, 164];
        let i = 0;
        this.bgmInterval = setInterval(() => {
            this.bgmOsc.frequency.exponentialRampToValueAtTime(notes[i], this.context.currentTime + 0.1);
            i = (i + 1) % notes.length;
        }, 1000);
    }

    stopBGM() {
        if (this.bgmOsc) {
            this.bgmOsc.stop();
            this.bgmOsc = null;
            clearInterval(this.bgmInterval);
        }
    }

    playTone(freq, type, duration, vol) {
        if (this.context.state === 'suspended') this.context.resume();
        
        const osc = this.context.createOscillator();
        const g = this.context.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.context.currentTime);
        
        g.gain.setValueAtTime(vol, this.context.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
        
        osc.connect(g);
        g.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.context.currentTime + duration);
    }
}

export const sounds = new SoundManager();
