(function () {
  const THEMES = ["Chats", "Chiens", "Nourriture", "Nature", "Portraits", "Mix"];
  const SCORE_KEY = "ia-ou-pas-ia:scores:v1";
  const PLAYER_KEY = "ia-ou-pas-ia:player:v1";
  const ACTIVE_SESSION_KEY = "ia-ou-pas-ia:active-session:v1";
  const ACTIVE_SESSION_VERSION = 1;
  const ROUNDS_PER_GAME = 12;
  const ZOOM_LENS_SCALE = 2.35;
  const PDF_PAGE = {
    width: 841.89,
    height: 595.28
  };
  const PDF_IMAGE_MARGIN = 42;
  const PDF_MAX_IMAGE_SIZE = 1200;
  const THEME_PICTOS = {
    Chats: "assets/pictos_themes/chat.svg",
    Chiens: "assets/pictos_themes/chien.svg",
    Nourriture: "assets/pictos_themes/nourriture.svg",
    Nature: "assets/pictos_themes/nature.svg",
    Portraits: "assets/pictos_themes/portrait.svg",
    Mix: "assets/pictos_themes/mix.svg"
  };
  const EXPORT_SITES = {
    muriers: {
      label: "EHPAD Les Mûriers",
      fileSlug: "ehpad-les-muriers"
    },
    "via-domitia": {
      label: "EHPAD Via Domitia",
      fileSlug: "ehpad-via-domitia"
    }
  };
  const PLAYER_NAME_FALLBACK = "Joueur";
  const PLAYER_NAME_MAX_LENGTH = 28;
  const PLAYER_NAME_ALLOWED_PATTERN = /^[A-Za-z0-9 '\-\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F]+$/;
  const PLAYER_NAME_EXACT_FORBIDDEN_TERMS = ["con", "cul", "pd", "tg", "mao", "fdp", "ntm"];
  const PLAYER_NAME_FORBIDDEN_TERMS = [
    "adolf",
    "hitler",
    "hitlerien",
    "nazi",
    "nazisme",
    "reich",
    "fuhrer",
    "gestapo",
    "mussolini",
    "stalin",
    "staline",
    "mao",
    "pol pot",
    "polpot",
    "pinochet",
    "franco",
    "saddam",
    "kim jong",
    "kimjong",
    "bachar",
    "bashar",
    "assad",
    "poutine",
    "putin",
    "ben laden",
    "benladen",
    "daech",
    "isis",
    "terroriste",
    "terrorisme",
    "abruti",
    "abrutie",
    "andouille",
    "batard",
    "batarde",
    "bite",
    "bites",
    "bouffon",
    "bouffonne",
    "branle",
    "branler",
    "branlette",
    "branleur",
    "branleuse",
    "chibre",
    "connarde",
    "connard",
    "connasse",
    "conasse",
    "connerie",
    "couille",
    "couilles",
    "couillon",
    "couillonne",
    "cretin",
    "cretine",
    "debile",
    "debilos",
    "demeure",
    "ducon",
    "emmerde",
    "emmerdeur",
    "emmerdeuse",
    "encule",
    "enculer",
    "enculee",
    "enfoire",
    "enfoiree",
    "face de cul",
    "fdp",
    "fiotte",
    "foutre",
    "garce",
    "gland",
    "gouine",
    "grosse merde",
    "idiot",
    "idiote",
    "imbecile",
    "merde",
    "merdeux",
    "merdeuse",
    "nique",
    "niquer",
    "nique ta mere",
    "ordure",
    "pedale",
    "petasse",
    "poufiasse",
    "pouffiasse",
    "pute",
    "putasse",
    "putain",
    "salaud",
    "salaude",
    "salopard",
    "salope",
    "sous merde",
    "ta gueule",
    "ta mere",
    "tamere",
    "tapin",
    "tapette",
    "tafiole",
    "tantouze",
    "tepu",
    "teub",
    "teube",
    "trou du cul",
    "zob",
    "bougnoule",
    "bicot",
    "chinetoque",
    "negre",
    "negresse",
    "negro",
    "youpin",
    "youpine",
    "antisemite",
    "antisemitisme",
    "fachiste",
    "fasciste",
    "raciste",
    "facho",
    "homophobe",
    "islamophobe",
    "pedophile",
    "pedophilie",
    "pedo",
    "violeur",
    "violeuse",
    "fuck",
    "shit",
    "bitch",
    "asshole"
  ];

  const themeClues = {
    Chats: [
      "Regarde si les pattes, la queue et les moustaches sont bien lisibles.",
      "Observe les poils : une texture trop régulière peut être suspecte.",
      "Vérifie si l'arrière-plan reste cohérent autour du corps."
    ],
    Chiens: [
      "Observe les pattes, la truffe et les oreilles.",
      "Cherche les zones où le pelage fusionne avec le décor.",
      "Regarde si les yeux ont une forme naturelle."
    ],
    Nourriture: [
      "Observe les textures : elles peuvent être trop parfaites ou fusionnées.",
      "Regarde les couverts, les bords d'assiettes et les reflets.",
      "Cherche des ombres ou volumes qui ne suivent pas la lumière."
    ],
    Nature: [
      "Observe les répétitions dans les feuilles, l'eau ou les rochers.",
      "Regarde si les ombres et les perspectives restent naturelles.",
      "Cherche les zones floues ou les détails semblent fondus."
    ],
    Portraits: [
      "Observe les mains, les oreilles, les dents et les accessoires.",
      "Regarde si les vêtements fusionnent avec le décor.",
      "Vérifie les lunettes, bijoux ou lignes du visage."
    ],
    Mix: [
      "Observe les détails fins avant de choisir.",
      "Compare la lumière, les bords et les objets difficiles à générer.",
      "Cherche les petites incohérences plutôt que l'impression générale."
    ]
  };

  const QUESTIONS = (window.IaOuPasIaQuestions || []).map(prepareQuestion);

  const state = {
    playerName: getInitialPlayerName(),
    view: "home",
    selectedTheme: "Mix",
    rounds: [],
    currentIndex: 0,
    score: 0,
    currentOptions: [],
    selectedOption: null,
    aiSideHistory: [],
    pendingScore: null,
    scoreSaved: false,
    downloadSiteId: ""
  };

  const screens = document.querySelectorAll("[data-screen]");
  const themeGrid = document.getElementById("themeGrid");
  const playerNameInput = document.getElementById("playerName");
  const answerGrid = document.getElementById("answerGrid");
  const publicHint = document.getElementById("publicHint");
  const resultImage = document.getElementById("resultImage");
  const clueList = document.getElementById("clueList");
  const scoresList = document.getElementById("scoresList");
  const finalPlayerNameInput = document.getElementById("finalPlayerName");
  const playerNameStatus = document.getElementById("playerNameStatus");
  const saveScoreButton = document.querySelector('[data-action="save-score"]');
  const saveStatus = document.getElementById("saveStatus");
  const zoomModal = document.getElementById("zoomModal");
  const zoomImageFrame = document.getElementById("zoomImageFrame");
  const downloadMenu = document.getElementById("downloadMenu");
  const downloadChoice = document.getElementById("downloadChoice");
  const downloadSiteLabel = document.getElementById("downloadSiteLabel");
  const downloadStatus = document.getElementById("downloadStatus");
  const downloadPdfButton = document.querySelector('[data-action="download-images-pdf"]');

  playerNameInput.value = state.playerName;
  finalPlayerNameInput.value = state.playerName;
  renderThemes();
  bindActions();
  window.addEventListener("pagehide", persistActiveSession);

  if (!restoreActiveSession()) {
    showScreen("home");
  }

  function prepareQuestion(question) {
    const clues = question.clues || themeClues[question.theme] || themeClues.Mix;
    return {
      ...question,
      educationalText: question.educationalText || "",
      clues,
      publicHint: question.publicHint || "Observe les détails, pas seulement l'impression générale.",
      ai: question.ai || null
    };
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const actionTarget = event.target.closest("[data-action]");
      if (!actionTarget) return;

      const action = actionTarget.dataset.action;
      if (action === "open-setup") showScreen("setup");
      if (action === "quick-play") startGame("Mix", true);
      if (action === "open-scores") {
        renderScores();
        showScreen("scores");
      }
      if (action === "go-home") showScreen("home");
      if (action === "next-round") nextRound();
      if (action === "restart-theme") startGame(state.selectedTheme, false);
      if (action === "replay") startGame(state.selectedTheme, false);
      if (action === "save-score") saveFinalScore();
      if (action === "close-zoom") closeZoomModal();
      if (action === "toggle-download-menu") toggleDownloadMenu(actionTarget);
      if (action === "select-download-site") selectDownloadSite(actionTarget.dataset.site);
      if (action === "download-images-pdf") downloadImagesPdf();
    });

    playerNameInput.addEventListener("input", () => {
      const player = normalizePlayerName(playerNameInput.value);
      const validation = validatePlayerName(player);
      updateNameValidationFeedback(playerNameInput, playerNameStatus, validation, player);
      state.playerName = validation.isValid ? validation.value : PLAYER_NAME_FALLBACK;
      if (!player) {
        localStorage.removeItem(PLAYER_KEY);
      } else if (validation.isValid) {
        localStorage.setItem(PLAYER_KEY, validation.value);
      }
      persistActiveSession();
    });

    finalPlayerNameInput.addEventListener("input", () => {
      const player = normalizePlayerName(finalPlayerNameInput.value);
      const validation = validatePlayerName(player);
      const isVisibleNameValid = updateNameValidationFeedback(finalPlayerNameInput, saveStatus, validation, player);
      state.playerName = validation.isValid ? validation.value : PLAYER_NAME_FALLBACK;
      if (!player) {
        localStorage.removeItem(PLAYER_KEY);
      } else if (validation.isValid) {
        localStorage.setItem(PLAYER_KEY, validation.value);
      }
      if (state.pendingScore && !state.scoreSaved) {
        state.pendingScore.player = validation.isValid ? validation.value : PLAYER_NAME_FALLBACK;
        updateFinalScoreLine();
        if (isVisibleNameValid) {
          saveStatus.textContent = "Votre score n'est pas encore enregistré.";
        }
      }
      persistActiveSession();
    });

    zoomModal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeZoomModal();
    });

    zoomImageFrame.addEventListener("mouseenter", updateZoomLens);
    zoomImageFrame.addEventListener("mousemove", updateZoomLens);
    zoomImageFrame.addEventListener("mouseleave", hideZoomLens);
  }

  function toggleDownloadMenu(button) {
    const shouldOpen = downloadMenu.hidden;
    downloadMenu.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", String(shouldOpen));
    if (shouldOpen) setDownloadStatus("");
  }

  function selectDownloadSite(siteId) {
    const site = EXPORT_SITES[siteId];
    if (!site) return;

    state.downloadSiteId = siteId;
    downloadMenu.hidden = true;
    document.querySelector('[data-action="toggle-download-menu"]').setAttribute("aria-expanded", "false");
    downloadChoice.hidden = false;
    downloadSiteLabel.textContent = site.label;
    downloadPdfButton.disabled = false;
    setDownloadStatus("");
  }

  async function downloadImagesPdf() {
    const site = EXPORT_SITES[state.downloadSiteId];
    if (!site || downloadPdfButton.disabled) return;

    const cards = getExportCards();
    if (!cards.length) {
      setDownloadStatus("Aucune image disponible pour le PDF.", true);
      return;
    }

    downloadPdfButton.disabled = true;
    setDownloadStatus("Préparation du PDF recto-verso...");

    try {
      const pdfBlob = await createDuplexPdf(cards, (current, total) => {
        setDownloadStatus(`Conversion des images ${current} / ${total}...`);
      });
      triggerDownload(pdfBlob, `ia-ou-pas-ia-${site.fileSlug}.pdf`);
      setDownloadStatus(`PDF téléchargé : ${cards.length} images, ${cards.length * 2} pages recto-verso.`);
    } catch (error) {
      setDownloadStatus(`Impossible de générer le PDF : ${error.message}`, true);
    } finally {
      downloadPdfButton.disabled = false;
    }
  }

  function getExportCards() {
    return QUESTIONS.flatMap((question) => {
      const cards = [];
      if (question.real && question.real.file) {
        cards.push({
          file: question.real.file,
          label: "PAS IA"
        });
      }
      if (question.ai && question.ai.file) {
        cards.push({
          file: question.ai.file,
          label: "IA"
        });
      }
      return cards;
    });
  }

  function setDownloadStatus(message, isError = false) {
    downloadStatus.textContent = message;
    downloadStatus.classList.toggle("is-error", isError);
  }

  async function createDuplexPdf(cards, onProgress) {
    const objects = [];
    const pageIds = [];
    const catalogId = addPdfObject(objects, "");
    const pagesId = addPdfObject(objects, "");

    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index];
      const image = await loadImageAsJpeg(card.file);
      if (onProgress) onProgress(index + 1, cards.length);

      const imageName = `Im${index + 1}`;
      const imageId = addPdfObject(objects, createImageObject(image));
      const frontContentId = addPdfObject(objects, createStreamObject(createFrontPageContent(image, imageName)));
      const frontPageId = addPdfObject(
        objects,
        pdfString(
          `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PDF_PAGE.width} ${PDF_PAGE.height}] ` +
            `/Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${frontContentId} 0 R >>`
        )
      );

      const backContentId = addPdfObject(objects, createStreamObject(pdfString(createBackPageContent(card.label))));
      const backPageId = addPdfObject(
        objects,
        pdfString(
          `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PDF_PAGE.width} ${PDF_PAGE.height}] ` +
            `/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> ` +
            `/Contents ${backContentId} 0 R >>`
        )
      );

      pageIds.push(frontPageId, backPageId);
    }

    objects[catalogId - 1] = pdfString(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    objects[pagesId - 1] = pdfString(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);

    return new Blob([buildPdf(objects)], { type: "application/pdf" });
  }

  function addPdfObject(objects, body) {
    objects.push(toPdfBytes(body));
    return objects.length;
  }

  async function loadImageAsJpeg(file) {
    const imageUrl = await getSafeImageUrl(file);
    try {
      const image = await loadImage(imageUrl.url);
      const ratio = Math.min(1, PDF_MAX_IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      return {
        width,
        height,
        bytes: await canvasToJpegBytes(canvas, 0.84)
      };
    } finally {
      imageUrl.revoke();
    }
  }

  async function getSafeImageUrl(file) {
    if (window.location.protocol === "file:") {
      throw new Error("ouvrez le site via un serveur local ou une adresse web pour générer le PDF");
    }

    const response = await fetch(file);
    if (!response.ok) throw new Error(`image introuvable (${file})`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return {
      url,
      revoke: () => URL.revokeObjectURL(url)
    };
  }

  function canvasToJpegBytes(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error("conversion image impossible"));
            return;
          }
          resolve(new Uint8Array(await blob.arrayBuffer()));
        },
        "image/jpeg",
        quality
      );
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`image introuvable (${file})`));
      image.src = file;
    });
  }

  function createImageObject(image) {
    return concatPdfBytes([
      pdfString(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`
      ),
      image.bytes,
      pdfString("\nendstream")
    ]);
  }

  function createStreamObject(content) {
    const bytes = toPdfBytes(content);
    return concatPdfBytes([pdfString(`<< /Length ${bytes.length} >>\nstream\n`), bytes, pdfString("\nendstream")]);
  }

  function createFrontPageContent(image, imageName) {
    const maxWidth = PDF_PAGE.width - PDF_IMAGE_MARGIN * 2;
    const maxHeight = PDF_PAGE.height - PDF_IMAGE_MARGIN * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (PDF_PAGE.width - width) / 2;
    const y = (PDF_PAGE.height - height) / 2;

    return pdfString(`q\n${formatPdfNumber(width)} 0 0 ${formatPdfNumber(height)} ${formatPdfNumber(x)} ${formatPdfNumber(y)} cm\n/${imageName} Do\nQ`);
  }

  function createBackPageContent(label) {
    const fontSize = label === "IA" ? 138 : 96;
    const estimatedTextWidth = label.length * fontSize * 0.58;
    const x = (PDF_PAGE.width - estimatedTextWidth) / 2;
    const y = PDF_PAGE.height / 2 - fontSize * 0.32;
    const color = label === "IA" ? "1 0.498 0.318" : "0.035 0.302 0.439";

    return `q\n${color} rg\nBT\n/F1 ${fontSize} Tf\n${formatPdfNumber(x)} ${formatPdfNumber(y)} Td\n(${escapePdfText(label)}) Tj\nET\nQ`;
  }

  function buildPdf(objects) {
    const chunks = [];
    const offsets = [0];
    let offset = 0;

    appendPdfChunk(chunks, pdfString("%PDF-1.4\n%----\n"));
    offset += chunks[chunks.length - 1].length;

    objects.forEach((body, index) => {
      const id = index + 1;
      offsets[id] = offset;
      [pdfString(`${id} 0 obj\n`), body, pdfString("\nendobj\n")].forEach((chunk) => {
        const bytes = toPdfBytes(chunk);
        appendPdfChunk(chunks, bytes);
        offset += bytes.length;
      });
    });

    const xrefOffset = offset;
    const xref =
      `xref\n0 ${objects.length + 1}\n` +
      `0000000000 65535 f \n` +
      offsets
        .slice(1)
        .map((item) => `${String(item).padStart(10, "0")} 00000 n \n`)
        .join("") +
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    appendPdfChunk(chunks, pdfString(xref));

    return concatPdfBytes(chunks);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function pdfString(value) {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      bytes[index] = value.charCodeAt(index) & 0xff;
    }
    return bytes;
  }

  function toPdfBytes(value) {
    return value instanceof Uint8Array ? value : pdfString(value);
  }

  function appendPdfChunk(chunks, chunk) {
    chunks.push(chunk);
  }

  function concatPdfBytes(chunks) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((chunk) => {
      merged.set(chunk, offset);
      offset += chunk.length;
    });
    return merged;
  }

  function escapePdfText(value) {
    return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function formatPdfNumber(value) {
    return Number(value.toFixed(2)).toString();
  }

  function renderThemes() {
    themeGrid.innerHTML = "";
    THEMES.forEach((theme) => {
      const button = document.createElement("button");
      button.className = "theme-card";
      button.dataset.theme = theme;
      button.type = "button";
      button.innerHTML = `
        <span class="theme-swatch" aria-hidden="true">
          <img src="${THEME_PICTOS[theme]}" alt="">
        </span>
        <span>${theme}</span>
      `;
      button.addEventListener("click", () => startGame(theme, false));
      themeGrid.appendChild(button);
    });
  }

  function startGame(theme, quickPlay) {
    const validation = validatePlayerName(playerNameInput.value);
    if (!validation.isValid) {
      showNameError(playerNameInput, playerNameStatus, validation.message);
      return;
    }

    const player = validation.value;
    state.playerName = player;
    state.selectedTheme = theme;
    clearNameError(playerNameInput, playerNameStatus);
    if (normalizePlayerName(playerNameInput.value)) {
      playerNameInput.value = player;
      localStorage.setItem(PLAYER_KEY, player);
    } else {
      localStorage.removeItem(PLAYER_KEY);
    }

    state.rounds = buildRounds(theme);
    state.currentIndex = 0;
    state.score = 0;
    state.aiSideHistory = [];
    state.pendingScore = null;
    state.scoreSaved = false;

    if (!quickPlay && state.rounds.length === 0) return;
    renderRound();
    showScreen("game");
  }

  function buildRounds(theme) {
    if (theme !== "Mix") {
      const pool = QUESTIONS.filter((question) => question.theme === theme);
      return shuffle(pool).slice(0, Math.min(ROUNDS_PER_GAME, pool.length));
    }

    const themeNames = THEMES.filter((themeName) => themeName !== "Mix");
    const picked = [];
    const usedIds = new Set();

    themeNames.forEach((themeName) => {
      shuffle(QUESTIONS.filter((question) => question.theme === themeName))
        .slice(0, 2)
        .forEach((question) => {
          picked.push(question);
          usedIds.add(question.id);
        });
    });

    const remainingSlots = Math.max(0, ROUNDS_PER_GAME - picked.length);
    const remaining = shuffle(QUESTIONS.filter((question) => !usedIds.has(question.id))).slice(0, remainingSlots);
    return shuffle([...picked, ...remaining]).slice(0, ROUNDS_PER_GAME);
  }

  function renderRound(optionOrder) {
    const question = state.rounds[state.currentIndex];
    const { realOption, aiOption } = createRoundOptions(question);

    if (isValidOptionOrder(optionOrder)) {
      const optionsByKind = { real: realOption, ai: aiOption };
      state.currentOptions = optionOrder.map((kind) => optionsByKind[kind]);
    } else {
      const aiSide = chooseAISide();
      state.currentOptions = aiSide === "left" ? [aiOption, realOption] : [realOption, aiOption];
    }

    state.selectedOption = null;

    document.getElementById("roundCounter").textContent = `Manche ${state.currentIndex + 1} / ${state.rounds.length}`;
    document.getElementById("themeBadge").textContent = `Thème : ${question.theme}`;
    document.getElementById("scoreBadge").textContent = `Score : ${state.score}`;
    publicHint.textContent = question.publicHint;

    answerGrid.innerHTML = "";
    state.currentOptions.forEach((option, index) => {
      answerGrid.appendChild(createImageCard(option, index, "choice"));
    });
  }

  function createRoundOptions(question) {
    const realOption = {
      kind: "real",
      isAI: false,
      file: question.real.file,
      credit: question.real,
      label: "Image reelle"
    };
    const aiOption = {
      kind: "ai",
      isAI: true,
      file: question.ai ? question.ai.file : "",
      credit: question.ai,
      label: "Image generee par IA",
      isPlaceholder: !question.ai || !question.ai.file
    };

    return { realOption, aiOption };
  }

  function chooseAISide() {
    const lastTwo = state.aiSideHistory.slice(-2);
    let side;
    if (lastTwo.length === 2 && lastTwo[0] === lastTwo[1]) {
      side = lastTwo[0] === "left" ? "right" : "left";
    } else {
      side = Math.random() < 0.5 ? "left" : "right";
    }
    state.aiSideHistory.push(side);
    return side;
  }

  function createImageCard(option, index, mode) {
    const isChoiceMode = mode === "choice";
    const card = document.createElement(isChoiceMode ? "button" : "div");
    const side = index === 0 ? "gauche" : "droite";
    card.className = `image-card ${option.isPlaceholder ? "is-placeholder" : ""}`;

    if (isChoiceMode) {
      card.type = "button";
      card.setAttribute("aria-label", `Choisir l'image de ${side}`);
    }

    if (option.file && !option.isPlaceholder) {
      const image = document.createElement("img");
      image.src = option.file;
      image.alt = `Image de ${side}`;
      image.loading = "eager";
      image.onerror = () => {
        card.classList.add("is-placeholder");
        card.innerHTML = placeholderMarkup(mode);
      };
      card.appendChild(image);
    } else {
      card.innerHTML = placeholderMarkup(mode);
    }

    if (isChoiceMode) {
      card.addEventListener("click", () => handleAnswer(option));
    }

    if (mode === "result" && option.file && !option.isPlaceholder) {
      const zoomButton = document.createElement("button");
      zoomButton.className = "zoom-button";
      zoomButton.type = "button";
      zoomButton.textContent = "Agrandir";
      zoomButton.setAttribute("aria-label", "Agrandir l'image IA");
      zoomButton.addEventListener("click", () => openZoomModal(option));
      card.appendChild(zoomButton);
    }

    return card;
  }

  function placeholderMarkup(mode) {
    const label = mode === "result" ? "Image IA à intégrer" : "Image à venir";
    return `<span class="placeholder-inner">${label}</span>`;
  }

  function handleAnswer(option) {
    state.selectedOption = option;
    if (option.isAI) state.score += 1;
    renderResult();
    showScreen("result");
  }

  function renderResult() {
    const question = state.rounds[state.currentIndex];
    const aiOption = state.currentOptions.find((option) => option.isAI);
    const aiIndex = state.currentOptions.findIndex((option) => option.isAI);
    const selectedIndex = state.currentOptions.indexOf(state.selectedOption);
    const isCorrect = state.selectedOption && state.selectedOption.isAI;
    const aiSide = aiIndex === 0 ? "gauche" : "droite";
    const selectedSide = selectedIndex === 0 ? "gauche" : "droite";

    document.getElementById("resultRoundCounter").textContent = `Manche ${state.currentIndex + 1} / ${state.rounds.length}`;
    document.getElementById("resultThemeBadge").textContent = `Thème : ${question.theme}`;
    document.getElementById("resultScoreBadge").textContent = `Score : ${state.score}`;
    document.getElementById("resultTitle").textContent = isCorrect ? "Bravo ! Bonne réponse" : "Mince ! Mauvaise réponse";
    document.getElementById("answerReveal").textContent = `Vous avez choisi l'image de ${selectedSide}. L'image de ${aiSide} était celle générée par IA.`;
    const educationalText = document.getElementById("educationalText");
    educationalText.textContent = question.educationalText;
    educationalText.hidden = !question.educationalText;

    resultImage.innerHTML = "";
    resultImage.appendChild(createImageCard(aiOption, aiIndex, "result"));

    clueList.innerHTML = "";
    question.clues.slice(0, 3).forEach((clue) => {
      const item = document.createElement("li");
      item.textContent = clue;
      clueList.appendChild(item);
    });

    const credit = question.real;
    const placeholderNote = aiOption.isPlaceholder ? " Image IA temporairement remplacée par un placeholder gris." : "";
    document.getElementById("creditLine").textContent = `Photo réelle : ${credit.photographer} - ${credit.source}.${placeholderNote}`;
  }

  function openZoomModal(option) {
    if (!option.file || option.isPlaceholder) return;

    zoomImageFrame.innerHTML = "";

    const image = document.createElement("img");
    image.className = "zoom-modal-image";
    image.src = option.file;
    image.alt = "Image IA agrandie";

    const lens = document.createElement("span");
    lens.className = "zoom-lens";
    lens.setAttribute("aria-hidden", "true");
    lens.style.backgroundImage = cssImageUrl(option.file);

    zoomImageFrame.appendChild(image);
    zoomImageFrame.appendChild(lens);

    zoomModal.classList.add("is-open");
    zoomModal.setAttribute("aria-hidden", "false");
    zoomModal.querySelector(".zoom-close-button").focus();
  }

  function closeZoomModal() {
    zoomModal.classList.remove("is-open");
    zoomModal.setAttribute("aria-hidden", "true");
    zoomImageFrame.innerHTML = "";
  }

  function updateZoomLens(event) {
    const image = zoomImageFrame.querySelector(".zoom-modal-image");
    const lens = zoomImageFrame.querySelector(".zoom-lens");
    if (!image || !lens) return;

    const imageRect = image.getBoundingClientRect();
    const frameRect = zoomImageFrame.getBoundingClientRect();
    const isInsideImage =
      event.clientX >= imageRect.left &&
      event.clientX <= imageRect.right &&
      event.clientY >= imageRect.top &&
      event.clientY <= imageRect.bottom;

    if (!isInsideImage) {
      hideZoomLens();
      return;
    }

    const x = event.clientX - imageRect.left;
    const y = event.clientY - imageRect.top;
    const lensSize = lens.offsetWidth || 180;

    lens.style.left = `${event.clientX - frameRect.left}px`;
    lens.style.top = `${event.clientY - frameRect.top}px`;
    lens.style.backgroundSize = `${imageRect.width * ZOOM_LENS_SCALE}px ${imageRect.height * ZOOM_LENS_SCALE}px`;
    lens.style.backgroundPosition = `${lensSize / 2 - x * ZOOM_LENS_SCALE}px ${lensSize / 2 - y * ZOOM_LENS_SCALE}px`;
    lens.classList.add("is-visible");
  }

  function hideZoomLens() {
    const lens = zoomImageFrame.querySelector(".zoom-lens");
    if (lens) lens.classList.remove("is-visible");
  }

  function cssImageUrl(file) {
    return `url("${file.replace(/"/g, '\\"')}")`;
  }

  function nextRound() {
    if (state.currentIndex < state.rounds.length - 1) {
      state.currentIndex += 1;
      renderRound();
      showScreen("game");
      return;
    }
    finishGame();
  }

  function finishGame() {
    const total = state.rounds.length;
    state.pendingScore = {
      player: getAcceptedPlayerName(state.playerName),
      theme: state.selectedTheme,
      score: state.score,
      total,
      date: new Date().toISOString()
    };
    state.scoreSaved = false;
    renderFinalScreen();
  }

  function renderFinalScreen() {
    if (!state.pendingScore) return;

    finalPlayerNameInput.value = state.pendingScore.player;
    finalPlayerNameInput.disabled = state.scoreSaved;
    saveScoreButton.disabled = state.scoreSaved;
    saveStatus.textContent = state.scoreSaved ? "Score enregistré." : "Votre score n'est pas encore enregistré.";
    saveStatus.classList.toggle("is-saved", state.scoreSaved);
    saveStatus.classList.remove("is-error");
    updateFinalScoreLine();
    document.getElementById("levelLabel").textContent = getLevelLabel(state.pendingScore.score, state.pendingScore.total);
    document.getElementById("bestScore").textContent = getThemeScoreLine(state.pendingScore.theme);
    showScreen("final");
  }

  function saveFinalScore() {
    if (!state.pendingScore || state.scoreSaved) return;

    const validation = validatePlayerName(finalPlayerNameInput.value);
    if (!validation.isValid) {
      showNameError(finalPlayerNameInput, saveStatus, validation.message);
      return;
    }

    const player = validation.value;
    const entry = {
      ...state.pendingScore,
      player,
      date: new Date().toISOString()
    };
    const scores = getScores();
    scores.push(entry);
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores.slice(-80)));
    localStorage.setItem(PLAYER_KEY, player);

    state.playerName = player;
    state.pendingScore = entry;
    state.scoreSaved = true;
    clearNameError(finalPlayerNameInput, saveStatus);
    renderFinalScreen();
  }

  function updateFinalScoreLine() {
    if (!state.pendingScore) return;
    document.getElementById("finalScore").textContent = `${state.pendingScore.player} - ${state.pendingScore.score} / ${state.pendingScore.total}`;
  }

  function getLevelLabel(score, total) {
    const ratio = total ? score / total : 0;
    if (ratio <= 0.34) return "Observateur débutant";
    if (ratio <= 0.67) return "Bon regard";
    if (ratio < 1) return "Œil affûté";
    return "Expert de l'observation";
  }

  function getThemeScoreLine(theme) {
    return `Score sur le thème : ${theme || "Mix"}`;
  }

  function getInitialPlayerName() {
    const storedName = localStorage.getItem(PLAYER_KEY) || "";
    const validation = validatePlayerName(storedName);
    if (!validation.isValid) {
      localStorage.removeItem(PLAYER_KEY);
      return "";
    }
    return validation.value === PLAYER_NAME_FALLBACK && !normalizePlayerName(storedName) ? "" : validation.value;
  }

  function getAcceptedPlayerName(rawName) {
    const validation = validatePlayerName(rawName);
    return validation.isValid ? validation.value : PLAYER_NAME_FALLBACK;
  }

  function validatePlayerName(rawName) {
    const name = normalizePlayerName(rawName);
    if (!name) {
      return {
        isValid: true,
        value: PLAYER_NAME_FALLBACK
      };
    }
    if (name.length > PLAYER_NAME_MAX_LENGTH) {
      return {
        isValid: false,
        message: `Le pseudo doit faire ${PLAYER_NAME_MAX_LENGTH} caractères maximum.`
      };
    }
    if (!PLAYER_NAME_ALLOWED_PATTERN.test(name)) {
      return {
        isValid: false,
        message: "Utilisez seulement lettres, chiffres, espaces, tirets ou apostrophes."
      };
    }
    if (isForbiddenPlayerName(name)) {
      return {
        isValid: false,
        message: "Ce pseudo n'est pas accepté."
      };
    }
    return {
      isValid: true,
      value: name
    };
  }

  function normalizePlayerName(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isForbiddenPlayerName(name) {
    const normalized = normalizeForModeration(name);
    const compact = normalized.replace(/[^a-z0-9]/g, "");
    const compactCollapsed = collapseRepeatedModerationChars(compact);
    const normalizedCollapsed = normalized
      .split(" ")
      .map(collapseRepeatedModerationChars)
      .join(" ");
    const tokens = normalized.split(" ").filter(Boolean);
    const collapsedTokens = normalizedCollapsed.split(" ").filter(Boolean);

    const hasExactForbiddenTerm = PLAYER_NAME_EXACT_FORBIDDEN_TERMS.some((term) => {
      const normalizedTerm = normalizeForModeration(term);
      const collapsedTerm = collapseRepeatedModerationChars(normalizedTerm);
      return (
        tokens.includes(normalizedTerm) ||
        collapsedTokens.includes(collapsedTerm) ||
        compact === normalizedTerm ||
        compactCollapsed === collapsedTerm
      );
    });
    if (hasExactForbiddenTerm) return true;

    return PLAYER_NAME_FORBIDDEN_TERMS.some((term) => {
      const normalizedTerm = normalizeForModeration(term);
      const collapsedTerm = normalizedTerm
        .split(" ")
        .map(collapseRepeatedModerationChars)
        .join(" ");
      const compactTerm = normalizedTerm.replace(/[^a-z0-9]/g, "");
      const compactCollapsedTerm = collapseRepeatedModerationChars(compactTerm);
      if (compactTerm.length <= 3) {
        return (
          tokens.includes(normalizedTerm) ||
          collapsedTokens.includes(collapsedTerm) ||
          compact === compactTerm ||
          compactCollapsed === compactCollapsedTerm
        );
      }
      return (
        normalized.includes(normalizedTerm) ||
        normalizedCollapsed.includes(collapsedTerm) ||
        compact.includes(compactTerm) ||
        compactCollapsed.includes(compactCollapsedTerm)
      );
    });
  }

  function normalizeForModeration(value) {
    return normalizePlayerName(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[4@]/g, "a")
      .replace(/3/g, "e")
      .replace(/[1!|]/g, "i")
      .replace(/0/g, "o")
      .replace(/[5$]/g, "s")
      .replace(/7/g, "t")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function collapseRepeatedModerationChars(value) {
    return String(value || "").replace(/([a-z0-9])\1+/g, "$1");
  }

  function showNameError(input, statusElement, message) {
    setNameError(input, statusElement, message);
    input.focus();
    input.reportValidity();
  }

  function updateNameValidationFeedback(input, statusElement, validation, rawName) {
    if (rawName && !validation.isValid) {
      setNameError(input, statusElement, validation.message);
      return false;
    }
    clearNameError(input, statusElement);
    return true;
  }

  function setNameError(input, statusElement, message) {
    input.classList.add("is-invalid");
    input.setCustomValidity(message);
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.classList.add("is-error");
      statusElement.classList.remove("is-saved");
    }
  }

  function clearNameError(input, statusElement) {
    input.classList.remove("is-invalid");
    input.setCustomValidity("");
    if (statusElement) {
      statusElement.classList.remove("is-error");
      if (statusElement === playerNameStatus) {
        statusElement.textContent = "";
      }
    }
  }

  function normalizeScoreEntry(entry) {
    if (!entry || typeof entry !== "object") return null;

    const score = Number(entry.score);
    const total = Number(entry.total);
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return null;

    return {
      player: getAcceptedPlayerName(entry.player),
      theme: THEMES.includes(entry.theme) ? entry.theme : "Mix",
      score,
      total
    };
  }

  function createScoreCell(tagName, text) {
    const element = document.createElement(tagName);
    element.textContent = text;
    return element;
  }

  function renderScores() {
    const scores = getScores()
      .map(normalizeScoreEntry)
      .filter(Boolean)
      .sort((a, b) => b.score / b.total - a.score / a.total || b.score - a.score)
      .slice(0, 12);
    scoresList.innerHTML = "";
    if (!scores.length) {
      const emptyScore = document.createElement("p");
      emptyScore.className = "empty-score";
      emptyScore.textContent = "Aucun score enregistré pour le moment.";
      scoresList.appendChild(emptyScore);
      return;
    }

    scores.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "score-row";
      row.append(
        createScoreCell("span", String(index + 1)),
        createScoreCell("strong", entry.player),
        createScoreCell("span", entry.theme),
        createScoreCell("span", `${entry.score} / ${entry.total}`)
      );
      scoresList.appendChild(row);
    });
  }

  function getScores() {
    try {
      return JSON.parse(localStorage.getItem(SCORE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function persistActiveSession() {
    if (state.view === "home") {
      clearActiveSession();
      return;
    }

    const snapshot = {
      version: ACTIVE_SESSION_VERSION,
      view: state.view
    };

    if (state.view === "setup") {
      snapshot.playerName = state.playerName;
    }

    if (state.view === "game" || state.view === "result") {
      if (!hasRestorableRoundState()) {
        clearActiveSession();
        return;
      }

      snapshot.playerName = state.playerName;
      snapshot.selectedTheme = state.selectedTheme;
      snapshot.roundIds = state.rounds.map((question) => question.id);
      snapshot.currentIndex = state.currentIndex;
      snapshot.score = state.score;
      snapshot.aiSideHistory = [...state.aiSideHistory];
      snapshot.optionOrder = state.currentOptions.map((option) => option.kind);

      if (state.view === "result") {
        if (!state.selectedOption || !["real", "ai"].includes(state.selectedOption.kind)) {
          clearActiveSession();
          return;
        }
        snapshot.selectedOptionKind = state.selectedOption.kind;
      }
    }

    if (state.view === "final") {
      const pendingScore = normalizePendingScore(state.pendingScore);
      if (!pendingScore) {
        clearActiveSession();
        return;
      }
      snapshot.pendingScore = pendingScore;
      snapshot.scoreSaved = Boolean(state.scoreSaved);
    }

    if (state.view !== "setup" && state.view !== "game" && state.view !== "result" && state.view !== "final" && state.view !== "scores") {
      clearActiveSession();
      return;
    }

    try {
      sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      // The game remains usable if session storage is unavailable.
    }
  }

  function restoreActiveSession() {
    const saved = readActiveSession();
    if (!saved) return false;

    if (saved.view === "setup") {
      restoreSessionPlayerName(saved.playerName);
      showScreen("setup");
      return true;
    }

    if (saved.view === "scores") {
      renderScores();
      showScreen("scores");
      return true;
    }

    if (saved.view === "game" || saved.view === "result") {
      if (!restoreRoundSession(saved)) {
        clearActiveSession();
        return false;
      }

      renderRound(saved.optionOrder);

      if (saved.view === "result") {
        state.selectedOption = state.currentOptions.find((option) => option.kind === saved.selectedOptionKind) || null;
        if (!state.selectedOption) {
          clearActiveSession();
          return false;
        }
        renderResult();
        showScreen("result");
      } else {
        showScreen("game");
      }
      return true;
    }

    if (saved.view === "final") {
      const pendingScore = normalizePendingScore(saved.pendingScore);
      if (!pendingScore) {
        clearActiveSession();
        return false;
      }

      state.playerName = pendingScore.player;
      state.selectedTheme = pendingScore.theme;
      state.pendingScore = pendingScore;
      state.scoreSaved = Boolean(saved.scoreSaved);
      renderFinalScreen();
      return true;
    }

    clearActiveSession();
    return false;
  }

  function readActiveSession() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(ACTIVE_SESSION_KEY) || "null");
      if (!saved || saved.version !== ACTIVE_SESSION_VERSION || typeof saved.view !== "string") return null;
      return saved;
    } catch {
      clearActiveSession();
      return null;
    }
  }

  function clearActiveSession() {
    try {
      sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      // The game remains usable if session storage is unavailable.
    }
  }

  function restoreRoundSession(saved) {
    if (!THEMES.includes(saved.selectedTheme) || !Array.isArray(saved.roundIds)) return false;
    if (!saved.roundIds.length || saved.roundIds.length > ROUNDS_PER_GAME) return false;
    if (new Set(saved.roundIds).size !== saved.roundIds.length || !saved.roundIds.every((id) => typeof id === "string")) return false;

    const questionsById = new Map(QUESTIONS.map((question) => [question.id, question]));
    const restoredRounds = saved.roundIds.map((id) => questionsById.get(id));
    if (restoredRounds.some((question) => !question)) return false;
    if (!Number.isInteger(saved.currentIndex) || saved.currentIndex < 0 || saved.currentIndex >= restoredRounds.length) return false;
    if (!Number.isInteger(saved.score) || saved.score < 0) return false;

    const maxScore = saved.view === "result" ? saved.currentIndex + 1 : saved.currentIndex;
    if (saved.score > maxScore) return false;
    if (!isValidAISideHistory(saved.aiSideHistory, saved.currentIndex) || !isValidOptionOrder(saved.optionOrder)) return false;

    const expectedOrder = saved.aiSideHistory[saved.aiSideHistory.length - 1] === "left" ? ["ai", "real"] : ["real", "ai"];
    if (saved.optionOrder[0] !== expectedOrder[0] || saved.optionOrder[1] !== expectedOrder[1]) return false;
    if (saved.view === "result" && !["real", "ai"].includes(saved.selectedOptionKind)) return false;

    state.playerName = getAcceptedPlayerName(saved.playerName);
    state.selectedTheme = saved.selectedTheme;
    state.rounds = restoredRounds;
    state.currentIndex = saved.currentIndex;
    state.score = saved.score;
    state.currentOptions = [];
    state.selectedOption = null;
    state.aiSideHistory = [...saved.aiSideHistory];
    state.pendingScore = null;
    state.scoreSaved = false;
    return true;
  }

  function restoreSessionPlayerName(playerName) {
    const player = getAcceptedPlayerName(playerName);
    state.playerName = player;
    playerNameInput.value = player === PLAYER_NAME_FALLBACK ? "" : player;
    finalPlayerNameInput.value = player;
  }

  function hasRestorableRoundState() {
    return (
      THEMES.includes(state.selectedTheme) &&
      Array.isArray(state.rounds) &&
      state.rounds.length > 0 &&
      Number.isInteger(state.currentIndex) &&
      state.currentIndex >= 0 &&
      state.currentIndex < state.rounds.length &&
      Number.isInteger(state.score) &&
      state.score >= 0 &&
      isValidAISideHistory(state.aiSideHistory, state.currentIndex) &&
      isValidOptionOrder(state.currentOptions.map((option) => option.kind))
    );
  }

  function isValidAISideHistory(history, currentIndex) {
    return (
      Array.isArray(history) &&
      history.length === currentIndex + 1 &&
      history.every((side) => side === "left" || side === "right")
    );
  }

  function isValidOptionOrder(order) {
    return Array.isArray(order) && order.length === 2 && new Set(order).size === 2 && order.includes("real") && order.includes("ai");
  }

  function normalizePendingScore(value) {
    if (!value || typeof value !== "object" || !THEMES.includes(value.theme)) return null;

    const score = Number(value.score);
    const total = Number(value.total);
    if (!Number.isInteger(score) || !Number.isInteger(total) || score < 0 || total < 1 || score > total) return null;

    return {
      player: getAcceptedPlayerName(value.player),
      theme: value.theme,
      score,
      total,
      date: typeof value.date === "string" ? value.date : new Date().toISOString()
    };
  }

  function showScreen(name) {
    state.view = name;
    screens.forEach((screen) => {
      screen.classList.toggle("is-active", screen.dataset.screen === name);
    });
    persistActiveSession();
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }
})();
