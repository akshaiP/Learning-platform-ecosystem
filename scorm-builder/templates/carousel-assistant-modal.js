// Carousel Assistant Modal Controller
// Vanilla JS implementation for interactive split-pane carousel with zoom/pan and voice assistant

(function() {
  'use strict';

  class SplitPaneManager {
    constructor(container, leftPane, rightPane, divider) {
      this.container = container;
      this.leftPane = leftPane;
      this.rightPane = rightPane;
      this.divider = divider;
      this.minPercent = 20;
      this.maxPercent = 80;
      this.currentPercent = this._loadSavedWidth() || 70;
      this.isDragging = false;
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onMouseUp = this._onMouseUp.bind(this);
      this._applyWidth(this.currentPercent);
      this._attach();
    }

    _loadSavedWidth() {
      try {
        const saved = sessionStorage.getItem('carouselSplitWidth');
        const num = saved ? parseInt(saved, 10) : null;
        return Number.isFinite(num) ? Math.min(this.maxPercent, Math.max(this.minPercent, num)) : null;
      } catch (e) {
        return null;
      }
    }

    _saveWidth() {
      try {
        sessionStorage.setItem('carouselSplitWidth', String(this.currentPercent));
      } catch (e) {}
    }

    _attach() {
      if (!this.divider) return;
      this.divider.addEventListener('mousedown', (e) => this._onMouseDown(e));
      this.divider.addEventListener('touchstart', (e) => this._onMouseDown(e.touches[0]));
    }

    _onMouseDown(e) {
      e.preventDefault();
      this.isDragging = true;
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('touchmove', this._onMouseMove, { passive: false });
      document.addEventListener('mouseup', this._onMouseUp);
      document.addEventListener('touchend', this._onMouseUp);
      this.container.classList.add('ca-resizing');
    }

    _onMouseMove(e) {
      if (!this.isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = this.container.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const percent = (offsetX / rect.width) * 100;
      const clamped = Math.min(this.maxPercent, Math.max(this.minPercent, percent));
      this.currentPercent = clamped;
      this._applyWidth(clamped);
      if (e.cancelable) e.preventDefault();
    }

    _onMouseUp() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('touchmove', this._onMouseMove);
      document.removeEventListener('mouseup', this._onMouseUp);
      document.removeEventListener('touchend', this._onMouseUp);
      this.container.classList.remove('ca-resizing');
      this._saveWidth();
    }

    _applyWidth(percent) {
      if (this.leftPane && this.rightPane) {
        this.leftPane.style.flexBasis = percent + '%';
        this.rightPane.style.flexBasis = (100 - percent) + '%';
      }
    }
  }

  class ImageZoomController {
    constructor(viewport, img) {
      this.viewport = viewport;
      this.img = img;
      this.scale = 1;
      this.translateX = 0;
      this.translateY = 0;
      this.minScale = 0.5;
      this.maxScale = 5;
      this.isPanning = false;
      this.startX = 0;
      this.startY = 0;
      this.lastX = 0;
      this.lastY = 0;
      this._wheel = this._wheel.bind(this);
      this._down = this._down.bind(this);
      this._move = this._move.bind(this);
      this._up = this._up.bind(this);
      this._attach();
      this._apply();
    }

    _attach() {
      if (!this.viewport) return;
      this.viewport.addEventListener('wheel', this._wheel, { passive: false });
      this.viewport.addEventListener('mousedown', this._down);
      this.viewport.addEventListener('mousemove', this._move);
      this.viewport.addEventListener('mouseup', this._up);
      this.viewport.addEventListener('mouseleave', this._up);
      this.viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          const t = e.touches[0];
          this._down(t);
        }
      }, { passive: false });
      this.viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          const t = e.touches[0];
          this._move(t);
          e.preventDefault();
        }
      }, { passive: false });
      this.viewport.addEventListener('touchend', () => this._up());
    }

    _wheel(e) {
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      const rect = this.viewport.getBoundingClientRect();
      const cx = (e.clientX - rect.left - this.translateX) / this.scale;
      const cy = (e.clientY - rect.top - this.translateY) / this.scale;
      const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * zoomFactor));
      const scaleChange = newScale / this.scale;
      this.translateX -= cx * (scaleChange - 1) * this.scale;
      this.translateY -= cy * (scaleChange - 1) * this.scale;
      this.scale = newScale;
      this._apply();
    }

    _down(e) {
      this.isPanning = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.lastX = this.translateX;
      this.lastY = this.translateY;
      this.viewport.classList.add('ca-panning');
    }

    _move(e) {
      if (!this.isPanning) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      this.translateX = this.lastX + dx;
      this.translateY = this.lastY + dy;
      this._apply();
    }

    _up() {
      this.isPanning = false;
      this.viewport.classList.remove('ca-panning');
    }

    reset() {
      this.scale = 1;
      this.translateX = 0;
      this.translateY = 0;
      this._apply();
    }

    zoomIn() {
      this.scale = Math.min(this.maxScale, this.scale * 1.2);
      this._apply();
    }

    zoomOut() {
      this.scale = Math.max(this.minScale, this.scale / 1.2);
      this._apply();
    }

    _apply() {
      if (this.img) {
        this.img.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
      }
    }
  }

  function getLearnerFirstName() {
    try {
      // Prefer scormLearnerData if available
      if (window.scormLearnerData && window.scormLearnerData.name) {
        const parts = String(window.scormLearnerData.name).trim().split(/\s+/);
        return parts[0] || 'learner';
      }
      // Try SCORM 2004
      if (window.scormAPI && typeof window.scormAPI.getValue === 'function') {
        const name2004 = window.scormAPI.getValue('cmi.learner_name');
        if (name2004) {
          const parts = String(name2004).trim().split(/\s*,\s*|\s+/); // handle Last, First
          // If format is "Last, First" take last part as first name
          const candidate = parts.length > 1 ? parts[parts.length - 1] : parts[0];
          return candidate || 'learner';
        }
      }
      // Try SCORM 1.2 (cmi.core.student_name)
      if (window.scormAPI && typeof window.scormAPI.getValue === 'function') {
        const name12 = window.scormAPI.getValue('cmi.core.student_name');
        if (name12) {
          const parts = String(name12).trim().split(/\s*,\s*|\s+/);
          const candidate = parts.length > 1 ? parts[parts.length - 1] : parts[0];
          return candidate || 'learner';
        }
      }
    } catch (e) {
      console.warn('Could not retrieve learner name:', e);
    }
    return 'learner';
  }

  class CarouselAssistantController {
    constructor(concepts) {
      this.concepts = Array.isArray(concepts) ? concepts : [];
      this.activeConceptIndex = 0;
      this.currentSlide = 0;
      this.totalSlides = 0;
      this.zoomController = null;
      this.splitPane = null;
      this.botBaseUrl = '';
      this._keydown = this._keydown.bind(this);
      this._onIframeLoad = this._onIframeLoad.bind(this);
      this._renderShell();
      this._bindGlobalInit();
    }

    _bindGlobalInit() {
      // Optional: expose global open function
      window.openCarouselForConcept = (idx) => this.open(idx);
    }

    _renderShell() {
      const host = document.getElementById('carouselAssistantModal');
      if (!host) return;
      host.innerHTML = this._modalHtml();
    }

    _modalHtml() {
      return (
        '<div class="ca-overlay" role="dialog" aria-modal="true" aria-label="Interactive Carousel" tabindex="-1">' +
          '<div class="ca-modal">' +
            '<button class="ca-close" aria-label="Close" title="Close"><i class="fas fa-times"></i></button>' +
            '<div class="ca-body">' +
              '<div class="ca-split" id="caSplitContainer">' +
                // LEFT PANE: Image + Iframe + Controls
                '<div class="ca-left" id="caLeftPane">' +
                  '<div class="ca-image-section">' +
                    '<div class="ca-viewport" id="caViewport">' +
                      '<img id="caImage" alt="Slide image" />' +
                      '<div class="ca-zoom-controls" aria-label="Zoom controls">' +
                        '<button class="ca-zoom-btn" data-zoom="in" aria-label="Zoom in" title="Zoom In"><i class="fas fa-search-plus"></i></button>' +
                        '<button class="ca-zoom-btn" data-zoom="out" aria-label="Zoom out" title="Zoom Out"><i class="fas fa-search-minus"></i></button>' +
                        '<button class="ca-zoom-btn ca-zoom-btn-reset" data-zoom="reset" aria-label="Reset zoom" title="Reset Zoom"><i class="fas fa-compress-arrows-alt"></i></button>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="ca-controls-section">' +
                    '<div class="ca-dots" id="caDots" aria-label="Slide indicators"></div>' +
                    '<div class="ca-iframe-controls">' +
                      '<button class="ca-nav ca-prev" aria-label="Previous slide"><i class="fas fa-chevron-left"></i><span>Prev</span></button>' +
                      '<div class="ca-iframe-wrap">' +
                        '<div class="ca-loader" id="caIframeLoader" aria-hidden="true"></div>' +
                        '<iframe id="caIframe" title="Voice Assistant" allow="microphone"></iframe>' +
                      '</div>' +
                      '<button class="ca-nav ca-next" aria-label="Next slide"><span>Next</span><i class="fas fa-chevron-right"></i></button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
                // DIVIDER
                '<div class="ca-divider" id="caDivider" aria-label="Resize panel" role="separator" aria-orientation="vertical" tabindex="0"></div>' +
                // RIGHT PANE: Description only (full height)
                '<div class="ca-right" id="caRightPane">' +
                  '<div class="ca-desc">' +
                    '<h4 id="caTopic" class="ca-topic-title"></h4>' +
                    '<div id="caDescription" class="ca-desc-scroll"></div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }    

    _els() {
      return {
        overlay: document.querySelector('#carouselAssistantModal .ca-overlay'),
        close: document.querySelector('#carouselAssistantModal .ca-close'),
        left: document.getElementById('caLeftPane'),
        right: document.getElementById('caRightPane'),
        divider: document.getElementById('caDivider'),
        viewport: document.getElementById('caViewport'),
        image: document.getElementById('caImage'),
        topic: document.getElementById('caTopic'),
        desc: document.getElementById('caDescription'),
        prev: document.querySelector('#carouselAssistantModal .ca-prev'),
        next: document.querySelector('#carouselAssistantModal .ca-next'),
        dots: document.getElementById('caDots'),
        split: document.getElementById('caSplitContainer'),
        iframe: document.getElementById('caIframe'),
        iframeLoader: document.getElementById('caIframeLoader')
      };
    }

    open(conceptIndex) {
      const idx = Number.isFinite(conceptIndex) ? conceptIndex : 0;
      this.activeConceptIndex = Math.max(0, Math.min(this.concepts.length - 1, idx));
      const concept = this.concepts[this.activeConceptIndex] || {};
      const config = concept.interactive_carousel || {};
      if (!config.enabled || !Array.isArray(config.slides) || config.slides.length === 0) {
        console.warn('Interactive carousel not enabled for this concept.');
        return;
      }
      this.botBaseUrl = config.bot_iframe_url || '';
      this.slides = config.slides;
      this.totalSlides = this.slides.length;
      this.currentSlide = 0;

      const els = this._els();
      if (!this.splitPane) {
        this.splitPane = new SplitPaneManager(els.split, els.left, els.right, els.divider);
      }
      if (!this.zoomController) {
        this.zoomController = new ImageZoomController(els.viewport, els.image);
      } else {
        this.zoomController.reset();
      }

      this._renderDots();
      this._renderSlide(0);
      this._attachEvents();
      this._show();
    }

    close() {
      this._detachEvents();
      this._teardownIframe();
      this._hide();
    }

    _show() {
      const els = this._els();
      const host = document.getElementById('carouselAssistantModal');
      if (host) host.classList.remove('hidden');
      if (els.overlay) {
        els.overlay.classList.add('ca-open');
      }
      document.addEventListener('keydown', this._keydown);
    }

    _hide() {
      const els = this._els();
      if (els.overlay) {
        els.overlay.classList.remove('ca-open');
      }
      const host = document.getElementById('carouselAssistantModal');
      if (host) host.classList.add('hidden');
      document.removeEventListener('keydown', this._keydown);
    }

    _attachEvents() {
      const els = this._els();
      if (els.close) els.close.onclick = () => this.close();
      if (els.prev) els.prev.onclick = () => this.prev();
      if (els.next) els.next.onclick = () => this.next();
      if (els.dots) {
        els.dots.onclick = (e) => {
          const btn = e.target.closest('[data-index]');
          if (btn) this.goTo(parseInt(btn.dataset.index, 10));
        };
      }
      if (els.viewport) {
        const zc = (action) => {
          if (!this.zoomController) return;
          if (action === 'in') this.zoomController.zoomIn();
          if (action === 'out') this.zoomController.zoomOut();
          if (action === 'reset') this.zoomController.reset();
        };
        els.viewport.addEventListener('click', (e) => {
          const btn = e.target.closest('.ca-zoom-btn');
          if (btn) zc(btn.getAttribute('data-zoom'));
        });
      }
    }

    _detachEvents() {
      const els = this._els();
      if (els.close) els.close.onclick = null;
      if (els.prev) els.prev.onclick = null;
      if (els.next) els.next.onclick = null;
      if (els.dots) els.dots.onclick = null;
    }

    _keydown(e) {
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    }

    _renderDots() {
      const els = this._els();
      if (!els.dots) return;
      els.dots.innerHTML = this.slides.map((_, i) => (
        `<button class="ca-dot${i === this.currentSlide ? ' active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`
      )).join('');
    }

    _renderSlide(index) {
      const i = Math.max(0, Math.min(this.totalSlides - 1, index));
      this.currentSlide = i;
      const slide = this.slides[i] || {};
      const els = this._els();
      if (els.image) {
        els.image.src = slide.image || '';
        els.image.alt = slide.topic || 'Slide image';
        if (this.zoomController) this.zoomController.reset();
      }
      if (els.topic) els.topic.textContent = slide.topic || '';
      
      if (els.desc) {
        els.desc.innerHTML = this._formatDescription(slide.description || '');
      }
      
      this._renderDots();
      this._setIframe(slide);
    }
    
    _formatDescription(text) {
      if (!text) return '';
      
      let formatted = text;
      
      // Convert line breaks
      formatted = formatted.replace(/\n/g, '<br>');
      
      // Convert **bold** to <strong>
      formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      
      // Convert *italic* to <em>
      formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
      
      // Convert bullet points (lines starting with - or *)
      formatted = formatted.replace(/^[\-\*]\s+(.+?)(<br>|$)/gm, '<li>$1</li>');
      
      // Wrap consecutive <li> in <ul>
      formatted = formatted.replace(/(<li>.*?<\/li>)+/gs, (match) => {
        return '<ul class="ca-list">' + match + '</ul>';
      });
      
      // Convert numbered lists (1. 2. 3.)
      formatted = formatted.replace(/^\d+\.\s+(.+?)(<br>|$)/gm, '<li>$1</li>');
      formatted = formatted.replace(/(<li>.*?<\/li>)+/gs, (match) => {
        if (match.includes('<ul')) return match; // Skip if already wrapped
        return '<ol class="ca-list">' + match + '</ol>';
      });
      
      // Wrap in paragraph if no block elements
      if (!formatted.includes('<ul') && !formatted.includes('<ol') && !formatted.includes('<p>')) {
        formatted = '<p>' + formatted + '</p>';
      }
      
      return formatted;
    }    

    prev() {
      const nextIdx = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
      this._renderSlide(nextIdx);
    }

    next() {
      const nextIdx = (this.currentSlide + 1) % this.totalSlides;
      this._renderSlide(nextIdx);
    }

    goTo(index) {
      this._renderSlide(index);
    }

    _setIframe(slide) {
      const els = this._els();
      // Ensure iframe exists (it may be removed on close)
      if (!els.iframe) {
        const wrap = document.querySelector('#carouselAssistantModal .ca-iframe-wrap');
        if (!wrap) return;
        const fresh = document.createElement('iframe');
        fresh.id = 'caIframe';
        fresh.title = 'Voice Assistant';
        fresh.setAttribute('allow', 'microphone');
        wrap.appendChild(fresh);
      }
      const refreshedEls = this._els();
      const iframe = refreshedEls.iframe;
      if (!iframe) return;
      const url = this._buildIframeUrl(slide);
      try {
        iframe.removeEventListener('load', this._onIframeLoad);
      } catch (e) {}
      if (refreshedEls.iframeLoader) refreshedEls.iframeLoader.setAttribute('aria-hidden', 'false');
      if (refreshedEls.iframeLoader) refreshedEls.iframeLoader.classList.add('visible');
      iframe.addEventListener('load', this._onIframeLoad);
      iframe.src = url;
    }

    _onIframeLoad() {
      const els = this._els();
      if (els.iframeLoader) {
        els.iframeLoader.classList.remove('visible');
        els.iframeLoader.setAttribute('aria-hidden', 'true');
      }
    }

    _buildIframeUrl(slide) {
      const firstName = getLearnerFirstName();
      const base = this.botBaseUrl || 'https://voice-bot-759854934093.us-central1.run.app/widget.html';
      // The learner name is ${firstName}
      const prompt = `${slide.prompt || ''}`;
      const encoded = encodeURIComponent(prompt.trim());
      const joiner = base.includes('?') ? '&' : '?';
      return `${base}${joiner}topics=${encoded}&widget=true`;
    }

    _teardownIframe() {
      const els = this._els();
      const iframe = els.iframe;
      if (!iframe) return;
      try {
        // Remove load handler
        iframe.removeEventListener('load', this._onIframeLoad);
      } catch (e) {}
      try {
        // Forcefully stop any media by unloading the document
        iframe.src = 'about:blank';
      } catch (e) {}
      // Remove the iframe node to fully terminate the browsing context
      const wrap = iframe.parentNode;
      if (wrap) {
        try { wrap.removeChild(iframe); } catch (e) {}
      }
      // Reset loader state if visible
      if (els.iframeLoader) {
        els.iframeLoader.classList.remove('visible');
        els.iframeLoader.setAttribute('aria-hidden', 'true');
      }
    }
  }

  // Expose globally
  window.CarouselAssistantController = CarouselAssistantController;
})();


