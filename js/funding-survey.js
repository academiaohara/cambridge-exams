// js/funding-survey.js — one-time funding preference survey on entry
(function () {
  'use strict';

  var STORAGE_KEY = 'engaged_funding_survey_v1';
  var DEFER_KEY = 'engaged_funding_survey_deferred_until';
  var LANG_KEY = 'engaged_funding_survey_lang';
  var _pendingTimer = null;
  var _currentLang = 'en';

  var SUPPORTED_LANGS = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'pt', label: 'Português' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'ca', label: 'Català' },
    { code: 'pl', label: 'Polski' },
    { code: 'ru', label: 'Русский' },
    { code: 'zh', label: '中文' },
    { code: 'ar', label: 'العربية' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' }
  ];

  var STRINGS = {
    en: {
      kicker: 'Your opinion matters',
      title: 'How should we fund EngagEd?',
      intro: 'We are deciding how to fund the website, and we would love to hear your opinion. Which model would you prefer?',
      option1Title: 'Free access to all content with ads',
      option1Desc: 'Optional subscription to remove ads',
      option2Title: 'Monthly subscription',
      option2Desc: 'Full content available only to subscribers',
      commentLabel: 'Feel free to explain your choice (optional)',
      commentPlaceholder: 'Share any thoughts…',
      submit: 'Submit',
      defer: 'Ask me later',
      sending: 'Sending…',
      errorNoChoice: 'Please choose one option.',
      langLabel: 'Language'
    },
    es: {
      kicker: 'Tu opinión importa',
      title: '¿Cómo deberíamos financiar EngagEd?',
      intro: 'Estamos decidiendo cómo financiar la web y nos encantaría conocer tu opinión. ¿Qué modelo prefieres?',
      option1Title: 'Acceso gratuito a todo el contenido con anuncios',
      option1Desc: 'Suscripción opcional para quitar los anuncios',
      option2Title: 'Suscripción mensual',
      option2Desc: 'Todo el contenido solo para suscriptores',
      commentLabel: 'Puedes explicar tu elección (opcional)',
      commentPlaceholder: 'Comparte lo que quieras…',
      submit: 'Enviar',
      defer: 'Pregúntame más tarde',
      sending: 'Enviando…',
      errorNoChoice: 'Elige una opción.',
      langLabel: 'Idioma'
    },
    fr: {
      kicker: 'Votre avis compte',
      title: 'Comment financer EngagEd ?',
      intro: 'Nous réfléchissons au financement du site et aimerions connaître votre avis. Quel modèle préférez-vous ?',
      option1Title: 'Accès gratuit à tout le contenu avec publicités',
      option1Desc: 'Abonnement optionnel pour supprimer les publicités',
      option2Title: 'Abonnement mensuel',
      option2Desc: 'Tout le contenu réservé aux abonnés',
      commentLabel: 'Expliquez votre choix si vous le souhaitez (facultatif)',
      commentPlaceholder: 'Partagez vos réflexions…',
      submit: 'Envoyer',
      defer: 'Me le demander plus tard',
      sending: 'Envoi…',
      errorNoChoice: 'Veuillez choisir une option.',
      langLabel: 'Langue'
    },
    pt: {
      kicker: 'A sua opinião importa',
      title: 'Como devemos financiar o EngagEd?',
      intro: 'Estamos a decidir como financiar o site e gostaríamos de saber a sua opinião. Qual modelo prefere?',
      option1Title: 'Acesso gratuito a todo o conteúdo com anúncios',
      option1Desc: 'Subscrição opcional para remover anúncios',
      option2Title: 'Subscrição mensal',
      option2Desc: 'Todo o conteúdo apenas para subscritores',
      commentLabel: 'Explique a sua escolha se quiser (opcional)',
      commentPlaceholder: 'Partilhe as suas ideias…',
      submit: 'Enviar',
      defer: 'Perguntar mais tarde',
      sending: 'A enviar…',
      errorNoChoice: 'Escolha uma opção.',
      langLabel: 'Idioma'
    },
    de: {
      kicker: 'Ihre Meinung zählt',
      title: 'Wie sollen wir EngagEd finanzieren?',
      intro: 'Wir überlegen, wie wir die Website finanzieren, und würden gern Ihre Meinung hören. Welches Modell bevorzugen Sie?',
      option1Title: 'Kostenloser Zugang zu allen Inhalten mit Werbung',
      option1Desc: 'Optionales Abo, um Werbung zu entfernen',
      option2Title: 'Monatliches Abonnement',
      option2Desc: 'Alle Inhalte nur für Abonnenten',
      commentLabel: 'Erklären Sie Ihre Wahl gerne (optional)',
      commentPlaceholder: 'Teilen Sie Ihre Gedanken…',
      submit: 'Absenden',
      defer: 'Später fragen',
      sending: 'Wird gesendet…',
      errorNoChoice: 'Bitte wählen Sie eine Option.',
      langLabel: 'Sprache'
    },
    it: {
      kicker: 'La tua opinione conta',
      title: 'Come dovremmo finanziare EngagEd?',
      intro: 'Stiamo decidendo come finanziare il sito e ci piacerebbe sentire la tua opinione. Quale modello preferisci?',
      option1Title: 'Accesso gratuito a tutti i contenuti con pubblicità',
      option1Desc: 'Abbonamento facoltativo per rimuovere le pubblicità',
      option2Title: 'Abbonamento mensile',
      option2Desc: 'Tutti i contenuti solo per gli abbonati',
      commentLabel: 'Spiega la tua scelta se vuoi (facoltativo)',
      commentPlaceholder: 'Condividi i tuoi pensieri…',
      submit: 'Invia',
      defer: 'Chiedimelo più tardi',
      sending: 'Invio…',
      errorNoChoice: 'Scegli un’opzione.',
      langLabel: 'Lingua'
    },
    ca: {
      kicker: 'La teva opinió importa',
      title: 'Com hauríem de finançar EngagEd?',
      intro: 'Estem decidint com finançar el lloc web i ens agradaria saber la teva opinió. Quin model prefereixes?',
      option1Title: 'Accés gratuït a tot el contingut amb anuncis',
      option1Desc: 'Subscripció opcional per eliminar els anuncis',
      option2Title: 'Subscripció mensual',
      option2Desc: 'Tot el contingut només per a subscriptors',
      commentLabel: 'Pots explicar la teva elecció (opcional)',
      commentPlaceholder: 'Comparteix el que vulguis…',
      submit: 'Enviar',
      defer: 'Pregunta-m’ho més tard',
      sending: 'S’està enviant…',
      errorNoChoice: 'Tria una opció.',
      langLabel: 'Idioma'
    },
    pl: {
      kicker: 'Twoja opinia ma znaczenie',
      title: 'Jak powinniśmy finansować EngagEd?',
      intro: 'Zastanawiamy się, jak finansować stronę, i chcielibyśmy poznać Twoją opinię. Który model wolisz?',
      option1Title: 'Bezpłatny dostęp do całej treści z reklamami',
      option1Desc: 'Opcjonalna subskrypcja, aby usunąć reklamy',
      option2Title: 'Subskrypcja miesięczna',
      option2Desc: 'Cała treść tylko dla subskrybentów',
      commentLabel: 'Wyjaśnij swój wybór, jeśli chcesz (opcjonalnie)',
      commentPlaceholder: 'Podziel się swoimi przemyśleniami…',
      submit: 'Wyślij',
      defer: 'Zapytaj mnie później',
      sending: 'Wysyłanie…',
      errorNoChoice: 'Wybierz jedną opcję.',
      langLabel: 'Język'
    },
    ru: {
      kicker: 'Ваше мнение важно',
      title: 'Как финансировать EngagEd?',
      intro: 'Мы решаем, как финансировать сайт, и будем рады узнать ваше мнение. Какую модель вы предпочитаете?',
      option1Title: 'Бесплатный доступ ко всему контенту с рекламой',
      option1Desc: 'Дополнительная подписка, чтобы убрать рекламу',
      option2Title: 'Ежемесячная подписка',
      option2Desc: 'Весь контент только для подписчиков',
      commentLabel: 'Объясните свой выбор при желании (необязательно)',
      commentPlaceholder: 'Поделитесь мыслями…',
      submit: 'Отправить',
      defer: 'Спросить позже',
      sending: 'Отправка…',
      errorNoChoice: 'Выберите один вариант.',
      langLabel: 'Язык'
    },
    zh: {
      kicker: '您的意见很重要',
      title: '我们应该如何为 EngagEd 提供资金？',
      intro: '我们正在决定如何为网站提供资金，很想听听您的意见。您更喜欢哪种模式？',
      option1Title: '免费访问全部内容（含广告）',
      option1Desc: '可选订阅以去除广告',
      option2Title: '按月订阅',
      option2Desc: '全部内容仅对订阅用户开放',
      commentLabel: '欢迎说明您的选择（选填）',
      commentPlaceholder: '分享您的想法…',
      submit: '提交',
      defer: '稍后再问我',
      sending: '发送中…',
      errorNoChoice: '请选择一个选项。',
      langLabel: '语言'
    },
    ar: {
      kicker: 'رأيك مهم',
      title: 'كيف يجب أن نموّل EngagEd؟',
      intro: 'نحن نقرر كيفية تمويل الموقع ونودّ معرفة رأيك. أي نموذج تفضّل؟',
      option1Title: 'وصول مجاني إلى كل المحتوى مع إعلانات',
      option1Desc: 'اشتراك اختياري لإزالة الإعلانات',
      option2Title: 'اشتراك شهري',
      option2Desc: 'المحتوى الكامل للمشتركين فقط',
      commentLabel: 'يمكنك شرح اختيارك (اختياري)',
      commentPlaceholder: 'شاركنا أفكارك…',
      submit: 'إرسال',
      defer: 'اسألني لاحقًا',
      sending: 'جارٍ الإرسال…',
      errorNoChoice: 'يرجى اختيار خيار واحد.',
      langLabel: 'اللغة'
    },
    ja: {
      kicker: 'ご意見をお聞かせください',
      title: 'EngagEd はどのように運営資金を確保すべきですか？',
      intro: 'サイトの資金調達方法を検討しています。ご希望のモデルを教えてください。',
      option1Title: '広告付きで全コンテンツに無料アクセス',
      option1Desc: '広告を非表示にするオプションのサブスクリプション',
      option2Title: '月額サブスクリプション',
      option2Desc: '全コンテンツはサブスクライバーのみ',
      commentLabel: '選択の理由を書いても構いません（任意）',
      commentPlaceholder: 'ご意見をお聞かせください…',
      submit: '送信',
      defer: '後で聞く',
      sending: '送信中…',
      errorNoChoice: 'いずれかを選んでください。',
      langLabel: '言語'
    },
    ko: {
      kicker: '여러분의 의견이 중요합니다',
      title: 'EngagEd는 어떻게 운영해야 할까요?',
      intro: '웹사이트 운영 방식을 결정하고 있으며, 여러분의 의견을 듣고 싶습니다. 어떤 모델을 선호하시나요?',
      option1Title: '광고와 함께 모든 콘텐츠 무료 이용',
      option1Desc: '광고 제거를 위한 선택적 구독',
      option2Title: '월 구독',
      option2Desc: '전체 콘텐츠는 구독자만 이용 가능',
      commentLabel: '선택 이유를 적어 주세요 (선택 사항)',
      commentPlaceholder: '의견을 공유해 주세요…',
      submit: '제출',
      defer: '나중에 물어보기',
      sending: '전송 중…',
      errorNoChoice: '옵션을 하나 선택해 주세요.',
      langLabel: '언어'
    }
  };

  function normalizeLang(code) {
    if (!code || typeof code !== 'string') return 'en';
    var base = code.toLowerCase().split('-')[0];
    if (STRINGS[base]) return base;
    return 'en';
  }

  function detectLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved && STRINGS[saved]) return saved;
    } catch (e) { /* ignore */ }

    var candidates = [];
    try {
      var pref = localStorage.getItem('preferred_language');
      if (pref) candidates.push(pref);
      var translate = localStorage.getItem('cambridge_translate_lang');
      if (translate) candidates.push(translate);
    } catch (e2) { /* ignore */ }

    if (typeof navigator !== 'undefined' && navigator.language) {
      candidates.push(navigator.language);
    }

    for (var i = 0; i < candidates.length; i++) {
      var lang = normalizeLang(candidates[i]);
      if (lang !== 'en' || candidates[i].toLowerCase().indexOf('en') === 0) {
        return lang;
      }
    }

    for (var j = 0; j < candidates.length; j++) {
      var lang2 = normalizeLang(candidates[j]);
      if (lang2 !== 'en') return lang2;
    }

    return 'en';
  }

  function t(key) {
    var pack = STRINGS[_currentLang] || STRINGS.en;
    return pack[key] != null ? pack[key] : STRINGS.en[key];
  }

  window.FundingSurvey = {
    isEnabled: function () {
      if (typeof CONFIG === 'undefined') return false;
      if (CONFIG.FUNDING_SURVEY_ENABLED === false) return false;
      if (CONFIG.FUNDING_SURVEY_ENABLED === true) return true;
      return !!CONFIG.PROMOTION_MODE;
    },

    hasCompleted: function () {
      try {
        return !!localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        return false;
      }
    },

    isDeferred: function () {
      try {
        var until = localStorage.getItem(DEFER_KEY);
        if (!until) return false;
        return Date.now() < parseInt(until, 10);
      } catch (e) {
        return false;
      }
    },

    getLang: function () {
      return _currentLang;
    },

    setLang: function (code) {
      var lang = normalizeLang(code);
      _currentLang = lang;
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
      this.applyLocale();
    },

    applyLocale: function () {
      var overlay = document.getElementById('funding-survey-overlay');
      if (!overlay) return;

      var kicker = overlay.querySelector('.funding-survey-kicker');
      var title = document.getElementById('funding-survey-title');
      var intro = overlay.querySelector('.funding-survey-intro');
      var opt1Title = document.getElementById('funding-survey-opt1-title');
      var opt1Desc = document.getElementById('funding-survey-opt1-desc');
      var opt2Title = document.getElementById('funding-survey-opt2-title');
      var opt2Desc = document.getElementById('funding-survey-opt2-desc');
      var commentLabel = document.getElementById('funding-survey-comment-label');
      var comment = document.getElementById('funding-survey-comment');
      var submitBtn = document.getElementById('funding-survey-submit');
      var deferBtn = overlay.querySelector('.funding-survey-defer');
      var langLabel = document.getElementById('funding-survey-lang-label');
      var langSelect = document.getElementById('funding-survey-lang');

      if (kicker) kicker.textContent = t('kicker');
      if (title) title.textContent = t('title');
      if (intro) intro.textContent = t('intro');
      if (opt1Title) opt1Title.textContent = t('option1Title');
      if (opt1Desc) opt1Desc.textContent = t('option1Desc');
      if (opt2Title) opt2Title.textContent = t('option2Title');
      if (opt2Desc) opt2Desc.textContent = t('option2Desc');
      if (commentLabel) commentLabel.textContent = t('commentLabel');
      if (comment) comment.placeholder = t('commentPlaceholder');
      if (submitBtn && !submitBtn.disabled) submitBtn.textContent = t('submit');
      if (deferBtn) deferBtn.textContent = t('defer');
      if (langLabel) langLabel.textContent = t('langLabel');
      if (langSelect) langSelect.value = _currentLang;

      var card = overlay.querySelector('.funding-survey-card');
      if (card) {
        card.setAttribute('dir', _currentLang === 'ar' ? 'rtl' : 'ltr');
        card.setAttribute('lang', _currentLang);
      }
    },

    _initLangSelect: function () {
      var select = document.getElementById('funding-survey-lang');
      if (!select || select.options.length > 0) return;

      var self = this;
      SUPPORTED_LANGS.forEach(function (item) {
        var opt = document.createElement('option');
        opt.value = item.code;
        opt.textContent = item.label;
        select.appendChild(opt);
      });

      select.addEventListener('change', function () {
        self.setLang(select.value);
      });
    },

    /** Call after auth modal is closed or on returning session. */
    maybeShow: function () {
      if (!this.isEnabled() || this.hasCompleted() || this.isDeferred()) return;
      var auth = document.getElementById('auth-modal-overlay');
      if (auth && auth.style.display !== 'none' && auth.classList.contains('visible')) return;

      var surveyOverlay = document.getElementById('funding-survey-overlay');
      if (surveyOverlay && surveyOverlay.classList.contains('visible')) return;

      if (_pendingTimer) return;
      var self = this;
      _pendingTimer = setTimeout(function () {
        _pendingTimer = null;
        if (!self.isEnabled() || self.hasCompleted() || self.isDeferred()) return;
        self._show();
      }, 600);
    },

    _show: function () {
      _currentLang = detectLang();
      this._initLangSelect();
      this.applyLocale();

      var overlay = document.getElementById('funding-survey-overlay');
      if (!overlay) return;
      overlay.classList.add('visible');
      overlay.style.display = 'flex';
      document.body.classList.add('funding-survey-open');
      var first = overlay.querySelector('input[name="funding_model"]');
      if (first) first.focus();
    },

    _hide: function () {
      var overlay = document.getElementById('funding-survey-overlay');
      if (!overlay) return;
      overlay.classList.remove('visible');
      overlay.classList.add('hiding');
      document.body.classList.remove('funding-survey-open');
      setTimeout(function () {
        overlay.style.display = 'none';
        overlay.classList.remove('hiding');
      }, 280);
    },

    defer: function () {
      var days = (CONFIG && CONFIG.FUNDING_SURVEY_DEFER_DAYS) || 3;
      try {
        localStorage.setItem(DEFER_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
      } catch (e) { /* ignore */ }
      this._hide();
    },

    submit: async function () {
      var form = document.getElementById('funding-survey-form');
      if (!form) return;

      var choiceEl = form.querySelector('input[name="funding_model"]:checked');
      var commentEl = document.getElementById('funding-survey-comment');
      var errEl = document.getElementById('funding-survey-error');
      var submitBtn = document.getElementById('funding-survey-submit');

      if (!choiceEl) {
        if (errEl) {
          errEl.textContent = t('errorNoChoice');
          errEl.style.display = 'block';
        }
        return;
      }

      var choice = choiceEl.value;
      var comment = commentEl ? (commentEl.value || '').trim() : '';

      if (errEl) errEl.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = t('sending');
      }

      try {
        var headers = { 'Content-Type': 'application/json' };
        if (typeof Auth !== 'undefined' && Auth.getToken) {
          var token = Auth.getToken();
          if (token) headers.Authorization = 'Bearer ' + token;
        }

        var res = await fetch('/api/funding-survey', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            choice: choice,
            comment: comment,
            level: AppState.currentLevel || null,
            isGuest: !!AppState.isGuest,
            surveyLang: _currentLang
          })
        });

        var data = {};
        try { data = await res.json(); } catch (e2) { /* empty */ }

        if (!res.ok && !data.storedLocally) {
          throw new Error(data.message || data.error || 'Could not save your response');
        }
      } catch (err) {
        console.warn('[FundingSurvey] save failed, storing locally', err);
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          choice: choice,
          at: new Date().toISOString(),
          lang: _currentLang
        }));
        localStorage.removeItem(DEFER_KEY);
      } catch (e3) { /* ignore */ }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('submit');
      }
      this._hide();
    }
  };

  _currentLang = detectLang();
})();
