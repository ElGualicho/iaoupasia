(function () {
  const THEMES = ["Chats", "Chiens", "Nourriture", "Nature", "Portraits", "Mix"];
  const SCORE_KEY = "ia-ou-pas-ia:scores:v1";
  const PLAYER_KEY = "ia-ou-pas-ia:player:v1";
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
    playerName: localStorage.getItem(PLAYER_KEY) || "",
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

  function prepareQuestion(question) {
    const clues = question.clues || themeClues[question.theme] || themeClues.Mix;
    return {
      ...question,
      educationalText:
        question.educationalText ||
        "Cette manche est prête pour le gameplay. Les indices précis seront à affiner lorsque l'image IA correspondante sera ajoutée.",
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
      if (action === "clear-scores") clearScores();
      if (action === "close-zoom") closeZoomModal();
      if (action === "toggle-download-menu") toggleDownloadMenu(actionTarget);
      if (action === "select-download-site") selectDownloadSite(actionTarget.dataset.site);
      if (action === "download-images-pdf") downloadImagesPdf();
    });

    playerNameInput.addEventListener("input", () => {
      state.playerName = playerNameInput.value.trim();
      localStorage.setItem(PLAYER_KEY, state.playerName);
    });

    finalPlayerNameInput.addEventListener("input", () => {
      const player = finalPlayerNameInput.value.trim();
      state.playerName = player;
      localStorage.setItem(PLAYER_KEY, player);
      if (state.pendingScore && !state.scoreSaved) {
        state.pendingScore.player = player || "Joueur";
        updateFinalScoreLine();
      }
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
    const player = playerNameInput.value.trim() || "Joueur";
    state.playerName = player;
    state.selectedTheme = theme;
    localStorage.setItem(PLAYER_KEY, player);

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

  function renderRound() {
    const question = state.rounds[state.currentIndex];
    const aiSide = chooseAISide();
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

    state.currentOptions = aiSide === "left" ? [aiOption, realOption] : [realOption, aiOption];
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
    document.getElementById("educationalText").textContent = question.educationalText;

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
      player: state.playerName || "Joueur",
      theme: state.selectedTheme,
      score: state.score,
      total,
      date: new Date().toISOString()
    };
    state.scoreSaved = false;
    finalPlayerNameInput.value = state.pendingScore.player;
    finalPlayerNameInput.disabled = false;
    saveScoreButton.disabled = false;
    saveStatus.textContent = "Votre score n'est pas encore enregistré.";
    saveStatus.classList.remove("is-saved");
    updateFinalScoreLine();
    document.getElementById("levelLabel").textContent = getLevelLabel(state.pendingScore.score, state.pendingScore.total);
    document.getElementById("bestScore").textContent = getThemeScoreLine(state.pendingScore.theme);
    showScreen("final");
  }

  function saveFinalScore() {
    if (!state.pendingScore || state.scoreSaved) return;

    const player = finalPlayerNameInput.value.trim() || "Joueur";
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
    finalPlayerNameInput.disabled = true;
    saveScoreButton.disabled = true;
    saveStatus.textContent = "Score enregistré.";
    saveStatus.classList.add("is-saved");
    updateFinalScoreLine();
    document.getElementById("bestScore").textContent = getThemeScoreLine(entry.theme);
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

  function renderScores() {
    const scores = getScores().sort((a, b) => b.score / b.total - a.score / a.total || b.score - a.score).slice(0, 12);
    scoresList.innerHTML = "";
    if (!scores.length) {
      scoresList.innerHTML = '<p class="empty-score">Aucun score enregistré pour le moment.</p>';
      return;
    }

    scores.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "score-row";
      row.innerHTML = `
        <span>${index + 1}</span>
        <strong>${entry.player}</strong>
        <span>${entry.theme}</span>
        <span>${entry.score} / ${entry.total}</span>
      `;
      scoresList.appendChild(row);
    });
  }

  function clearScores() {
    localStorage.removeItem(SCORE_KEY);
    renderScores();
  }

  function getScores() {
    try {
      return JSON.parse(localStorage.getItem(SCORE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function showScreen(name) {
    screens.forEach((screen) => {
      screen.classList.toggle("is-active", screen.dataset.screen === name);
    });
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
