// js/static-pages.js
(function() {
  var PAGES = {
    terms: {
      title: 'Terms and Conditions',
      icon: 'gavel',
      intro: 'Please read these terms carefully before using EngagEd.',
      sections: [
        {
          heading: 'Use of the platform',
          content: 'EngagEd is provided for educational purposes. You agree to use the platform responsibly and in compliance with applicable laws.'
        },
        {
          heading: 'User responsibilities',
          content: 'You are responsible for keeping your account secure and for the content you submit while using exercises and AI tools.'
        },
        {
          heading: 'Service availability',
          content: 'We may update, change, or temporarily suspend parts of the service to improve reliability, features, or security.'
        }
      ]
    },
    about: {
      title: 'About EngagEd',
      icon: 'info',
      intro: 'EngagEd is a Cambridge exam practice platform focused on practical, interactive learning.',
      sections: [
        {
          heading: 'Our mission',
          content: 'Help learners prepare for B1, B2, and C1 exams with clear structure, instant feedback, and modern study tools.'
        },
        {
          heading: 'What we offer',
          content: 'Practice tests, fast exercises, exam tips, AI-assisted writing support, and progress tracking in one place.'
        }
      ]
    },
    contact: {
      title: 'Contact',
      icon: 'mail',
      intro: 'Need help or want to share feedback? We would love to hear from you.',
      sections: [
        {
          heading: 'Email',
          content: 'You can contact us at: engagedtoenglish@gmail.com'
        },
        {
          heading: 'Social channels',
          content: 'You can also reach us on Instagram, YouTube, or TikTok through the links in the footer.'
        }
      ]
    },
    privacy: {
      title: 'Privacy Policy',
      icon: 'shield_lock',
      intro: 'We value your privacy and process data only as needed to provide the service.',
      sections: [
        {
          heading: 'Data we use',
          content: 'We may store progress, preferences, and account identifiers to keep your learning experience personalized.'
        },
        {
          heading: 'How data is used',
          content: 'Data is used to deliver features such as authentication, progress tracking, and optional AI-powered feedback.'
        },
        {
          heading: 'Your control',
          content: 'You can stop using the service at any time and clear local browser data from your device settings.'
        }
      ]
    },
    faq: {
      title: 'Frequently Asked Questions',
      icon: 'quiz',
      intro: 'Quick answers to common questions about EngagEd.',
      sections: [
        {
          heading: 'Do I need an account?',
          content: 'You can start as a guest, but signing in helps save your progress consistently across sessions.'
        },
        {
          heading: 'Which exams are available?',
          content: 'The platform includes practice for B1 Preliminary, B2 First, and C1 Advanced.'
        },
        {
          heading: 'Is AI required?',
          content: 'No. Most features work without AI. AI is optional for writing and speaking enhancements.'
        }
      ]
    }
  };

  window.StaticPages = {
    open: function(pageKey) {
      this.render(pageKey, true);
    },

    render: function(pageKey, pushHistory) {
      var page = PAGES[pageKey];
      if (!page) return;
      var content = document.getElementById('main-content');
      if (!content) return;

      if (window.QuestionNav && typeof QuestionNav.close === 'function') QuestionNav.close();
      AppState.currentView = pageKey;
      if (typeof App !== 'undefined' && App.updateHeaderModeButtons) App.updateHeaderModeButtons();

      var sectionsHtml = page.sections.map(function(section) {
        return '<section class="static-page-section">' +
          '<h3>' + section.heading + '</h3>' +
          '<p>' + section.content + '</p>' +
        '</section>';
      }).join('');

      content.innerHTML =
        '<div class="static-page-wrapper">' +
          '<div class="static-page-header">' +
            '<button class="static-page-back-btn" onclick="loadDashboard()">Back</button>' +
            '<h1><span class="material-symbols-outlined" aria-hidden="true">' + page.icon + '</span>' + page.title + '</h1>' +
          '</div>' +
          '<div class="static-page-card">' +
            '<p class="static-page-intro">' + page.intro + '</p>' +
            sectionsHtml +
          '</div>' +
        '</div>';

      if (pushHistory !== false) {
        history.pushState({ view: pageKey }, '', Router.stateToPath({ view: pageKey }));
      }
    }
  };

  window.openTermsPage = function() { StaticPages.open('terms'); };
  window.openAboutPage = function() { StaticPages.open('about'); };
  window.openContactPage = function() { StaticPages.open('contact'); };
  window.openPrivacyPage = function() { StaticPages.open('privacy'); };
  window.openFaqPage = function() { StaticPages.open('faq'); };
})();
