// js/exercise-types/speaking-type.js
// Speaking interface - Cambridge C1 Speaking Parts

(function() {
  window.SpeakingType = {

    initListeners: function() {
      const exercise = AppState.currentExercise;
      if (!exercise) return;

      const container = document.getElementById('selectable-text');
      if (!container) return;

      const task = exercise.content.task || exercise.content.questions?.[0]?.task || '';
      const images = exercise.content.questions?.[0]?.images || [];
      const options = exercise.content.options || [];

      let imagesHTML = images.map(src => `<img class="speaking-type-image" src="${src}" alt="Speaking task image">`).join('');
      let optionsHTML = options.length
        ? `<ul class="speaking-type-options">${options.map(o => `<li>${o}</li>`).join('')}</ul>`
        : '';

      const html = `
        <div class="speaking-type-wrapper">
          <div class="speaking-type-task">
            <h3><i class="fas fa-comments"></i> ${exercise.title || I18n.t('startSpeaking')}</h3>
            <p class="speaking-type-task-text">${task}</p>
            ${optionsHTML}
            ${imagesHTML ? `<div class="speaking-type-images">${imagesHTML}</div>` : ''}
          </div>
        </div>
      `;

      const noteCreator = container.querySelector('#note-creator');
      const wrapper = document.createElement('div');
      wrapper.className = 'speaking-type-container';
      wrapper.innerHTML = html;
      container.insertBefore(wrapper, noteCreator);

      const checkBtn = document.querySelector('.btn-check');
      const explBtn = document.querySelector('.btn-explanations');
      if (checkBtn) checkBtn.style.display = 'none';
      if (explBtn) explBtn.style.display = 'none';
    },

    checkAnswers: function() {
      return 0;
    }
  };
})();
