(function () {
  var app = document.querySelector("[data-sf-app]");
  if (!app) {
    return;
  }

  var STORAGE_KEY = "lumiereDuMondeSurveyResponses";
  var currentStep = 0;
  var answers = {};

  var questions = [
    { name: "satisfactionGlobale", type: "rating", title: "Comment évaluez-vous globalement le concert ?", required: true },
    { name: "qualiteMusicale", type: "rating", title: "Comment évaluez-vous la qualité de l'interprétation musicale de la chorale ?", required: true },
    { name: "appreciationRepertoire", type: "rating", title: "Comment avez-vous apprécié le choix du répertoire ?", required: true },
    {
      name: "experienceLieu",
      type: "single",
      title: "Comment évaluez-vous votre expérience dans le lieu du concert ?",
      options: ["Très satisfaisante", "Satisfaisante", "Moyenne", "Insatisfaisante"],
      required: true
    },
    { name: "momentPrefere", type: "text", title: "Quel moment ou quelle œuvre vous a le plus marqué ?", help: "Une phrase suffit si vous le souhaitez." },
    {
      name: "souhaiteRevenir",
      type: "single",
      title: "Souhaiteriez-vous assister à un prochain concert de la Chorale Lumière du Monde ?",
      options: ["Oui", "Peut-être", "Non"],
      required: true
    },
    { name: "suggestion", type: "text", title: "Que pourrions-nous améliorer pour notre prochain concert ?" },
    {
      name: "concertUpdates",
      type: "consent",
      title: "Rester informé des prochains concerts",
      help: "Cette section est facultative et indépendante du sondage. Vous pouvez envoyer vos réponses sans communiquer votre identité."
    }
  ];

  var stage = app.querySelector("[data-sf-question-stage]");
  var form = app.querySelector("[data-sf-survey-form]");
  var thankYou = app.querySelector("[data-sf-thank-you]");
  var prevButton = app.querySelector("[data-sf-prev]");
  var nextButton = app.querySelector("[data-sf-next]");
  var submitButton = app.querySelector("[data-sf-submit]");
  var progressBar = app.querySelector("[data-sf-progress-bar]");
  var stepLabel = app.querySelector("[data-sf-step-label]");
  var progressPercent = app.querySelector("[data-sf-progress-percent]");
  var dashboard = app.querySelector(".sf-dashboard");
  var resetModal = app.querySelector("[data-sf-reset-modal]");

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStoredResponses() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveResponses(responses) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
  }

  function saveSubmission() {
    var responses = getStoredResponses();
    var submission = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      dateSoumission: new Date().toISOString(),
      satisfactionGlobale: Number(answers.satisfactionGlobale),
      qualiteMusicale: Number(answers.qualiteMusicale),
      appreciationRepertoire: Number(answers.appreciationRepertoire),
      experienceLieu: answers.experienceLieu || "",
      momentPrefere: answers.momentPrefere || "",
      souhaiteRevenir: answers.souhaiteRevenir || "",
      suggestion: answers.suggestion || ""
    };

    if (answers.consent === "yes") {
      submission.consentementConcerts = true;
      submission.prenom = answers.firstName || "";
      submission.courriel = answers.email || "";
    }

    responses.push(submission);
    saveResponses(responses);
    return submission;
  }

  function average(responses, fieldName) {
    if (!responses.length) {
      return null;
    }

    var total = responses.reduce(function (sum, response) {
      return sum + Number(response[fieldName] || 0);
    }, 0);

    return total / responses.length;
  }

  function formatAverage(value) {
    return value === null ? "— / 5" : value.toFixed(1).replace(".", ",") + " / 5";
  }

  function percentage(count, total) {
    return total ? Math.round((count / total) * 100) : 0;
  }

  function calculateKpis() {
    var responses = getStoredResponses();
    var total = responses.length;
    var returnCounts = { "Oui": 0, "Peut-être": 0, "Non": 0 };
    var ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    var venueExperience = {};
    var comments = [];
    var suggestions = [];

    responses.forEach(function (response) {
      var globalRating = Number(response.satisfactionGlobale);
      if (ratingDistribution[globalRating] !== undefined) {
        ratingDistribution[globalRating] += 1;
      }

      if (returnCounts[response.souhaiteRevenir] !== undefined) {
        returnCounts[response.souhaiteRevenir] += 1;
      }

      if (response.experienceLieu) {
        venueExperience[response.experienceLieu] = (venueExperience[response.experienceLieu] || 0) + 1;
      }

      if (response.momentPrefere && response.momentPrefere.trim()) {
        comments.push(response.momentPrefere.trim());
      }

      if (response.suggestion && response.suggestion.trim()) {
        suggestions.push(response.suggestion.trim());
      }
    });

    return {
      total: total,
      satisfactionAverage: average(responses, "satisfactionGlobale"),
      musicAverage: average(responses, "qualiteMusicale"),
      repertoireAverage: average(responses, "appreciationRepertoire"),
      returnYesPercent: percentage(returnCounts["Oui"], total),
      returnMaybePercent: percentage(returnCounts["Peut-être"], total),
      returnNoPercent: percentage(returnCounts["Non"], total),
      ratingDistribution: ratingDistribution,
      venueExperience: venueExperience,
      suggestionsCount: suggestions.length,
      comments: comments,
      suggestions: suggestions
    };
  }

  function renderDashboard() {
    var kpis = calculateKpis();
    var metrics = app.querySelector("[data-sf-dashboard-metrics]");
    var comments = app.querySelector("[data-sf-comments]");
    var suggestions = app.querySelector("[data-sf-suggestions]");
    var bars = app.querySelector("[data-sf-bars]");
    var insights = app.querySelector("[data-sf-insights]");
    var emptyState = app.querySelector("[data-sf-empty-state]");
    var maxRatingCount = Math.max.apply(null, Object.keys(kpis.ratingDistribution).map(function (key) {
      return kpis.ratingDistribution[key];
    }));

    metrics.innerHTML = [
      metricTemplate("Réponses", kpis.total),
      metricTemplate("Satisfaction", formatAverage(kpis.satisfactionAverage)),
      metricTemplate("Qualité musicale", formatAverage(kpis.musicAverage)),
      metricTemplate("Répertoire", formatAverage(kpis.repertoireAverage)),
      metricTemplate("Retour Oui", kpis.returnYesPercent + " %"),
      metricTemplate("Retour Peut-être", kpis.returnMaybePercent + " %"),
      metricTemplate("Retour Non", kpis.returnNoPercent + " %"),
      metricTemplate("Suggestions", kpis.suggestionsCount)
    ].join("");

    emptyState.hidden = kpis.total > 0;

    comments.innerHTML = kpis.comments.length
      ? kpis.comments.map(listItemTemplate).join("")
      : "<li>Aucun commentaire pour le moment.</li>";

    suggestions.innerHTML = kpis.suggestions.length
      ? kpis.suggestions.map(listItemTemplate).join("")
      : "<li>Aucun commentaire pour le moment.</li>";

    bars.innerHTML = Object.keys(kpis.ratingDistribution).map(function (rating) {
      var count = kpis.ratingDistribution[rating];
      var height = maxRatingCount ? Math.max(8, Math.round((count / maxRatingCount) * 100)) : 0;
      return '<span style="height: ' + height + '%" title="' + rating + '/5 : ' + count + ' réponse(s)"></span>';
    }).join("");

    insights.innerHTML = buildInsights(kpis).map(listItemTemplate).join("");
  }

  function metricTemplate(label, value) {
    return '<article class="sf-metric-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function listItemTemplate(item) {
    return "<li>" + escapeHtml(item) + "</li>";
  }

  function buildInsights(kpis) {
    if (!kpis.total) {
      return ["Les analyses apparaîtront après les premières réponses au sondage."];
    }

    var ratedAspects = [
      { label: "La satisfaction globale", value: kpis.satisfactionAverage },
      { label: "La qualité musicale", value: kpis.musicAverage },
      { label: "Le répertoire", value: kpis.repertoireAverage }
    ].sort(function (a, b) {
      return b.value - a.value;
    });

    return [
      ratedAspects[0].label + " est l'aspect le mieux évalué avec " + formatAverage(ratedAspects[0].value) + ".",
      kpis.returnYesPercent + " % des participants souhaitent assister à un prochain concert.",
      kpis.suggestionsCount + " suggestion(s) ont été reçue(s)."
    ];
  }

  function renderQuestion() {
    var question = questions[currentStep];
    var progress = Math.round(((currentStep + 1) / questions.length) * 100);

    stage.innerHTML = [
      '<div class="sf-question-card">',
      "  <h3>" + escapeHtml(question.title) + "</h3>",
      question.help ? '  <p class="sf-question-help">' + escapeHtml(question.help) + "</p>" : "",
      renderQuestionControl(question),
      "</div>"
    ].join("");

    progressBar.style.width = progress + "%";
    stepLabel.textContent = "Question " + (currentStep + 1) + " sur " + questions.length;
    progressPercent.textContent = progress + "%";
    prevButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === questions.length - 1;
    submitButton.hidden = currentStep !== questions.length - 1;
  }

  function renderQuestionControl(question) {
    if (question.type === "rating") {
      return '<div class="sf-options sf-rating">' + [1, 2, 3, 4, 5].map(function (value) {
        var checked = String(value) === String(answers[question.name] || "") ? " checked" : "";
        return '<label class="sf-option"><input type="radio" name="' + question.name + '" value="' + value + '"' + checked + '><span>' + value + "</span></label>";
      }).join("") + "</div>";
    }

    if (question.type === "single") {
      return '<div class="sf-options">' + question.options.map(function (option) {
        var checked = option === answers[question.name] ? " checked" : "";
        return '<label class="sf-option"><input type="radio" name="' + question.name + '" value="' + escapeHtml(option) + '"' + checked + ">" + escapeHtml(option) + "</label>";
      }).join("") + "</div>";
    }

    if (question.type === "consent") {
      return [
        '<div class="sf-consent-box">',
        '  <label class="sf-consent-check"><input type="checkbox" name="consent" value="yes"' + (answers.consent === "yes" ? " checked" : "") + '> <span>Je souhaite être informé(e) des prochains concerts et je consens à être contacté(e) à cette fin.</span></label>',
        '  <label>Prénom facultatif<input class="sf-input" type="text" name="firstName" value="' + escapeHtml(answers.firstName || "") + '" placeholder="Votre prénom"></label>',
        '  <label>Adresse courriel facultative<input class="sf-input" type="email" name="email" value="' + escapeHtml(answers.email || "") + '" placeholder="nom@example.com"></label>',
        "</div>"
      ].join("");
    }

    return '<textarea class="sf-textarea" name="' + question.name + '" placeholder="Votre réponse">' + escapeHtml(answers[question.name] || "") + "</textarea>";
  }

  function saveCurrentAnswer() {
    var question = questions[currentStep];
    var data = new FormData(form);

    if (question.type === "consent") {
      answers.consent = data.get("consent") || "";
      answers.firstName = data.get("firstName") || "";
      answers.email = data.get("email") || "";
      return true;
    }

    answers[question.name] = data.get(question.name) || "";
    return !question.required || Boolean(answers[question.name]);
  }

  function showValidationMessage() {
    if (!stage.querySelector("[data-error]")) {
      stage.insertAdjacentHTML("beforeend", '<p class="sf-question-help" data-error>Veuillez choisir une réponse pour continuer.</p>');
    }
  }

  function answerAgain() {
    answers = {};
    currentStep = 0;
    form.reset();
    form.hidden = false;
    thankYou.hidden = true;
    renderQuestion();
    document.getElementById("sondage").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetResults() {
    localStorage.removeItem(STORAGE_KEY);
    renderDashboard();
    resetModal.hidden = true;
    dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  app.querySelector("[data-sf-start]").addEventListener("click", function () {
    document.getElementById("sondage").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  prevButton.addEventListener("click", function () {
    saveCurrentAnswer();
    currentStep = Math.max(0, currentStep - 1);
    renderQuestion();
  });

  nextButton.addEventListener("click", function () {
    if (!saveCurrentAnswer()) {
      showValidationMessage();
      return;
    }

    currentStep = Math.min(questions.length - 1, currentStep + 1);
    renderQuestion();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    saveCurrentAnswer();
    saveSubmission();
    renderDashboard();
    form.hidden = true;
    thankYou.hidden = false;
    dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  app.querySelector("[data-sf-reset]").addEventListener("click", answerAgain);
  app.querySelector("[data-sf-answer-again]").addEventListener("click", answerAgain);
  app.querySelector("[data-sf-open-reset]").addEventListener("click", function () {
    resetModal.hidden = false;
  });
  app.querySelector("[data-sf-cancel-reset]").addEventListener("click", function () {
    resetModal.hidden = true;
  });
  app.querySelector("[data-sf-confirm-reset]").addEventListener("click", resetResults);

  renderQuestion();
  renderDashboard();
})();
