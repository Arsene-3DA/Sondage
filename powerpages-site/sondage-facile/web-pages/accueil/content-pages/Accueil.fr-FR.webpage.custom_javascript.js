(function () {
  var app = document.querySelector("[data-sf-app]");
  if (!app) {
    return;
  }

  // Mock data isolated here. Replace this object with Dataverse results when logical table names are confirmed.
  var dashboardMock = {
    totalResponses: 86,
    globalAverage: 4.7,
    musicAverage: 4.8,
    repertoireAverage: 4.6,
    returnRate: "91%",
    comments: [
      "La cohésion des voix a créé un moment très émouvant.",
      "Le répertoire était varié, accessible et profond.",
      "Le lieu renforçait la dimension spirituelle du concert."
    ],
    suggestions: [
      "Prévoir un court programme imprimé avec les titres.",
      "Annoncer plus clairement les prochains rendez-vous.",
      "Ajouter un temps d'échange après le concert."
    ],
    chartValues: [82, 92, 76, 88, 95]
  };

  var questions = [
    {
      name: "globalRating",
      type: "rating",
      title: "Comment évaluez-vous globalement le concert ?",
      required: true
    },
    {
      name: "musicalQuality",
      type: "rating",
      title: "Comment évaluez-vous la qualité de l'interprétation musicale de la chorale ?",
      required: true
    },
    {
      name: "repertoire",
      type: "rating",
      title: "Comment avez-vous apprécié le choix du répertoire ?",
      required: true
    },
    {
      name: "venueExperience",
      type: "single",
      title: "Comment évaluez-vous votre expérience dans le lieu du concert ?",
      options: ["Très satisfaisante", "Satisfaisante", "Moyenne", "Insatisfaisante"],
      required: true
    },
    {
      name: "memorableMoment",
      type: "text",
      title: "Quel moment ou quelle œuvre vous a le plus marqué ?",
      help: "Une phrase suffit si vous le souhaitez.",
      required: false
    },
    {
      name: "nextConcert",
      type: "single",
      title: "Souhaiteriez-vous assister à un prochain concert de la Chorale Lumière du Monde ?",
      options: ["Oui", "Peut-être", "Non"],
      required: true
    },
    {
      name: "improvements",
      type: "text",
      title: "Que pourrions-nous améliorer pour notre prochain concert ?",
      required: false
    },
    {
      name: "concertUpdates",
      type: "consent",
      title: "Rester informé des prochains concerts",
      help: "Cette section est facultative et indépendante du sondage. Vous pouvez envoyer vos réponses sans communiquer votre identité.",
      required: false
    }
  ];

  var currentStep = 0;
  var answers = {};
  var stage = app.querySelector("[data-sf-question-stage]");
  var form = app.querySelector("[data-sf-survey-form]");
  var thankYou = app.querySelector("[data-sf-thank-you]");
  var prevButton = app.querySelector("[data-sf-prev]");
  var nextButton = app.querySelector("[data-sf-next]");
  var submitButton = app.querySelector("[data-sf-submit]");
  var progressBar = app.querySelector("[data-sf-progress-bar]");
  var stepLabel = app.querySelector("[data-sf-step-label]");
  var progressPercent = app.querySelector("[data-sf-progress-percent]");

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderRating(question) {
    var selected = answers[question.name] || "";
    var items = [1, 2, 3, 4, 5].map(function (value) {
      var checked = String(value) === selected ? " checked" : "";
      return '<label class="sf-option"><input type="radio" name="' + question.name + '" value="' + value + '"' + checked + '><span>' + value + '</span></label>';
    });

    return '<div class="sf-options sf-rating">' + items.join("") + "</div>";
  }

  function renderSingleChoice(question) {
    var selected = answers[question.name] || "";
    var items = question.options.map(function (option) {
      var checked = option === selected ? " checked" : "";
      return '<label class="sf-option"><input type="radio" name="' + question.name + '" value="' + escapeHtml(option) + '"' + checked + ">" + escapeHtml(option) + "</label>";
    });

    return '<div class="sf-options">' + items.join("") + "</div>";
  }

  function renderText(question) {
    var value = answers[question.name] || "";
    return '<textarea class="sf-textarea" name="' + question.name + '" placeholder="Votre reponse">' + escapeHtml(value) + "</textarea>";
  }

  function renderConsent(question) {
    var consent = answers.consent === "yes" ? " checked" : "";
    var firstName = answers.firstName || "";
    var email = answers.email || "";

    return [
      '<div class="sf-consent-box">',
      '  <label class="sf-consent-check"><input type="checkbox" name="consent" value="yes"' + consent + '> <span>Je souhaite être informé(e) des prochains concerts et je consens à être contacté(e) à cette fin.</span></label>',
      '  <label>Prénom facultatif<input class="sf-input" type="text" name="firstName" value="' + escapeHtml(firstName) + '" placeholder="Votre prénom"></label>',
      '  <label>Adresse courriel facultative<input class="sf-input" type="email" name="email" value="' + escapeHtml(email) + '" placeholder="nom@example.com"></label>',
      '</div>'
    ].join("");
  }

  function renderQuestion() {
    var question = questions[currentStep];
    var body = "";
    var progress = Math.round(((currentStep + 1) / questions.length) * 100);

    if (question.type === "rating") {
      body = renderRating(question);
    } else if (question.type === "single") {
      body = renderSingleChoice(question);
    } else if (question.type === "consent") {
      body = renderConsent(question);
    } else {
      body = renderText(question);
    }

    stage.innerHTML = [
      '<div class="sf-question-card">',
      '  <h3>' + escapeHtml(question.title) + "</h3>",
      question.help ? '  <p class="sf-question-help">' + escapeHtml(question.help) + "</p>" : "",
      body,
      "</div>"
    ].join("");

    progressBar.style.width = progress + "%";
    stepLabel.textContent = "Question " + (currentStep + 1) + " sur " + questions.length;
    progressPercent.textContent = progress + "%";
    prevButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === questions.length - 1;
    submitButton.hidden = currentStep !== questions.length - 1;
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
    var existing = stage.querySelector(".sf-question-help[data-error]");
    if (existing) {
      return;
    }

    stage.insertAdjacentHTML("beforeend", '<p class="sf-question-help" data-error>Veuillez choisir une réponse pour continuer.</p>');
  }

  function renderDashboard() {
    var metrics = app.querySelector("[data-sf-dashboard-metrics]");
    var comments = app.querySelector("[data-sf-comments]");
    var suggestions = app.querySelector("[data-sf-suggestions]");
    var bars = app.querySelector("[data-sf-bars]");

    if (metrics) {
      metrics.innerHTML = [
        metricTemplate("Réponses", dashboardMock.totalResponses),
        metricTemplate("Note globale", dashboardMock.globalAverage + "/5"),
        metricTemplate("Qualite musicale", dashboardMock.musicAverage + "/5"),
        metricTemplate("Souhaitent revenir", dashboardMock.returnRate)
      ].join("");
    }

    if (comments) {
      comments.innerHTML = dashboardMock.comments.map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join("");
    }

    if (suggestions) {
      suggestions.innerHTML = dashboardMock.suggestions.map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join("");
    }

    if (bars) {
      bars.innerHTML = dashboardMock.chartValues.map(function (value) {
        return '<span style="height: ' + value + '%"></span>';
      }).join("");
    }
  }

  function metricTemplate(label, value) {
    return '<article class="sf-metric-card"><span>' + label + '</span><strong>' + value + '</strong></article>';
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
    form.hidden = true;
    thankYou.hidden = false;
    thankYou.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  app.querySelector("[data-sf-reset]").addEventListener("click", function () {
    form.hidden = false;
    thankYou.hidden = true;
    document.getElementById("sondage").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  renderQuestion();
  renderDashboard();
})();
