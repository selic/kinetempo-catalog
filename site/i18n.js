/**
 * The site in three languages.
 *
 * The markup ships in English — that is what a reader without this script gets,
 * and what a search engine indexes — and everything carrying a `data-i18n` key is
 * swapped here. The choice is the reader's: `?lang=` wins, then what they picked
 * last, then what their browser asks for. The catalog page keeps its own strings
 * (its cards and facets are built by browse.js) and follows the same choice.
 */
(() => {
  const LANGS = ['en', 'ru', 'ro'];
  const KEY = 'kt.lang';
  const NAMES = { en: 'EN', ru: 'RU', ro: 'RO' };
  /** Strings holding a link or a bold word; they are constants in this file, never anyone's input. */
  const HTML = new Set(['heroFigure', 'aiNote', 'demoCaption', 'card1Title', 'card4Body', 'downloadBody', 'supportIntro', 'supportA4', 'demoNote']);

  const T = {
    en: {},
    ru: {
      docTitle: 'Kinetempo — таймер для физиотерапевтических упражнений',
      navDemo: 'Демо',
      navCatalog: 'Каталог',
      navSupport: 'Поддержка',
      navPrivacy: 'Приватность',
      navTerms: 'Условия',
      footPrivacy: 'Политика приватности',
      footTerms: 'Условия использования',
      footSupport: 'Поддержка',
      footDisclaimer: 'Kinetempo не является медицинским изделием и не даёт медицинских советов.',
      heroTitle: 'Физиотерапия, отсчитанная вслух.',
      heroLead:
        'Реабилитация — работа по секундомеру: держать восемь секунд, отпускать четыре, двадцать пять раз, — и делаете вы это обычно лёжа на полу. Kinetempo даёт каждому шагу свой звук, тикает последние три секунды и продолжает считать при заблокированном экране.',
      heroFigure:
        '<strong>Фигурка нарисована под ваше упражнение.</strong> Стоя, сидя, лёжа — это углы суставов, движущиеся в такт вашим шагам, а не ролик из готового списка.',
      ctaGet: 'Скачать приложение',
      ctaDemo: 'Попробовать в браузере',
      ctaCatalog: 'Открыть каталог',
      createTitle: 'Своё упражнение за две минуты',
      createLead:
        'Kinetempo — не фиксированный набор тренировок, а таймер, который вы настраиваете: руками или с ИИ-ассистентом. Опишите упражнение в чате, и он ответит ссылкой, добавляющей его в приложение вместе с фигуркой.',
      aiClaude: 'Создать с Claude',
      aiChatgpt: 'Создать с ChatGPT',
      aiCopy: 'Скопировать запрос',
      aiCopied: 'Скопировано — вставьте ассистенту',
      aiCopyManual: 'Выделите и скопируйте из поля ниже',
      aiNote:
        'Claude и ChatGPT откроются с уже написанным запросом; для остальных скопируйте его и вставьте сами. Ассистенту нужно уметь открыть ссылку и запустить код — без этого он пришлёт анимацию текстом, который можно вставить в упражнение вручную. Нужна только фигурка к упражнению, которое уже есть? Дайте ему <a href="./animation-only.txt">руководство по анимации</a> — там код не нужен вовсе.',
      demoCaption:
        '<strong>От начала до конца.</strong> Два вопроса про повторы и подходы — и ссылка, открывающая готовое упражнение. Вырезаны только полминуты, пока ассистент работал.',
      card1Title: '<span class="phase work">НАПРЯЖЕНИЕ</span> <span class="phase rest">ОТДЫХ</span>',
      card1Body:
        'У каждого шага повтора свой цвет, свой звук и своя поза: напряжение, подъём, удержание, опускание, движение, отдых. Последние три секунды тикают — темп слышно, на часы смотреть не нужно.',
      card2Title: 'Звук не смолкает на заблокированном экране',
      card2Body:
        'Заблокируйте телефон или положите его экраном вниз — сигналы продолжатся. iOS показывает остаток на экране блокировки, Android — уведомление с обратным отсчётом.',
      card3Title: 'Собирается как вам нужно',
      card3Body:
        'Возьмите пресет — изометрическое удержание, подъём · удержание · опускание, динамические повторы, простой таймер — или задайте свои шаги: тип, секунды, тики, подпись. Упражнения складываются в программу с паузами между ними.',
      card4Title: 'Ссылка, QR-код или файл',
      card4Body:
        'Программа целиком едет внутри ссылки — никуда ничего не загружается, — поэтому физиотерапевт передаёт её пациенту одним касанием. Отправьте её в <a href="./catalog/">публичный каталог</a>, и после проверки она появится у всех в «Библиотеке».',
      card5Title: 'Приватность по умолчанию',
      card5Body:
        'Всё остаётся на телефоне: без аккаунта и без слежки. В сеть приложение выходит за публичным каталогом — и за тем, что вы сами решили туда отправить. English, Русский, Română — вместе со звуками и подписями на экране блокировки.',
      screensTitle: 'Экраны',
      shot1: 'Удержание в процессе — цвет, счёт и фигурка вместе',
      shot2: 'Упражнение, написанное ассистентом, вместе с фигуркой',
      shot3: 'Программа: упражнения по порядку, с паузами',
      shot4: 'Публичный каталог внутри приложения',
      tryTitle: 'Попробуйте в браузере',
      tryBody: 'Плеер, переписанный для веба: те же шаги, те же звуки, та же схематичная фигурка. Ставить ничего не нужно.',
      tryCta: 'Открыть демо',
      downloadTitle: 'Загрузка',
      downloadBody:
        'Ссылки на App Store и Google Play появятся здесь после публикации. Пока тестировщики могут запросить приглашение в TestFlight по адресу <a href="mailto:es@defency.net">es@defency.net</a>.',
      demoDocTitle: "Kinetempo — попробовать таймер",
      demoTitle: "Попробуйте таймер",
      demoLead: "Это плеер приложения, переписанный для браузера: та же модель шагов, те же звуки, та же схематичная фигурка. Выберите пресет и нажмите «Старт» (для звука нужно одно касание).",
      demoNote: "В самом приложении таймер работает и с заблокированным экраном, показывает Live Activity или уведомление и ведёт программы из нескольких упражнений. ",
      demoGet: "Скачать приложение",
      demoReady: "Готовы?",
      demoPaused: "Пауза",
      demoDone: "Готово!",
      demoStart: "Старт",
      demoPause: "Пауза",
      demoResume: "Продолжить",
      demoAgain: "Ещё раз",
      demoSkip: "Пропуск",
      demoReset: "Сброс",
      demoReset: "Сброс",
      demoSession: "Сессия",
      demoReps: "повторов",
      demoPresetSlr: "Подъём прямой ноги",
      demoPresetQuad: "Изометрия квадрицепса",
      demoPresetHeel: "Скольжение пяткой",
      demoPresetPumps: "Насосы стопой",
      demoPresetProp: "Пятка на валике (таймер)",
      demoStepLock: "Замкни колено",
      demoStepLower: "Опускай медленно",
      demoStepIn: "Сгибай (≤90°)",
      demoStepOut: "Разгибай",
      demoStepUp: "Носок на себя",
      demoStepDown: "Носок от себя",
      demoStepHang: "Расслабь и дай повисеть",
      supportDocTitle: "Kinetempo — поддержка",
      supportTitle: "Поддержка",
      supportIntro: "Напишите на <a href=\"mailto:es@defency.net?subject=Kinetempo\">es@defency.net</a> или заведите issue на <a href=\"https://github.com/selic/kinetempo/issues\">GitHub</a>. Укажите модель телефона, версию ОС и версию приложения из «Настройки → О приложении».",
      supportFaq: "Частые вопросы",
      supportQ1: "Что показывает виджет на экране блокировки?",
      supportA1: "Остаток сессии и следующие шаги с их собственными отсчётами — то, что iOS умеет рисовать без приложения. iOS ограничивает, как часто фоновое приложение обновляет Live Activity, поэтому виджет намеренно не пытается повторять каждый шаг: при заблокированном экране ориентируйтесь на звук. Виджет можно выключить в настройках.",
      supportQ2: "Нет звука при включённом беззвучном режиме",
      supportA2: "Kinetempo использует аудиокатегорию воспроизведения, поэтому сигналы играют и в беззвучном режиме. Проверьте громкость медиа и что «Звуки» включены в настройках.",
      supportQ3: "Как поделиться программой с пациентом или другом?",
      supportA3: "Откройте программу → «Поделиться». Отправьте ссылку, покажите QR-код или выгрузите файл. Локальные видео в поделённое не попадают — для видео используйте ссылки.",
      supportQ4: "Как клиникам публиковать программы?",
      supportA4: "Смотрите <a href=\"https://github.com/selic/kinetempo-catalog/blob/main/docs/AUTHORING.ru.md\">руководство для авторов</a>: создайте папку издателя, добавьте файлы программ, откройте pull request.",
      shareDocTitle: "Kinetempo — программой поделились",
      catalogDocTitle: "Каталог — Kinetempo",
      shareTitle: "С вами поделились программой",
      shareLead: "Откройте её в Kinetempo, чтобы импортировать упражнения. Данные программы живут только в этой ссылке — никуда ничего не загружалось.",
      shareOpen: "Открыть в Kinetempo",
      shareGet: "Скачать приложение",
      demoTone_prep: "Приготовьтесь",
      demoHint_prep: "Скоро начинаем…",
      demoTone_squeeze: "Напряги",
      demoHint_squeeze: "Держи, дыши ровно",
      demoTone_hold: "Держи",
      demoHint_hold: "Удерживай",
      demoTone_lift: "Подними",
      demoHint_lift: "Поднимай медленно",
      demoTone_release: "Опусти",
      demoHint_release: "Опускай с контролем",
      demoTone_move: "Движение",
      demoHint_move: "Плавно по амплитуде",
      demoTone_timer: "Таймер",
      demoHint_timer: "Продолжай",
      demoTone_rest: "Расслабь",
      demoHint_rest: "Отпусти, выдохни",
      aiPrompt:
        'Прочитай https://selic.github.io/kinetempo-catalog/anim-guide.txt и сделай по нему упражнение для Kinetempo с анимацией.\n\nСпроси всё, что нужно знать про движение, тайминг и число повторов, а потом пришли ссылку для импорта.',
    },
    ro: {
      docTitle: 'Kinetempo — cronometru pentru exerciții de fizioterapie',
      navDemo: 'Demo',
      navCatalog: 'Catalog',
      navSupport: 'Asistență',
      navPrivacy: 'Confidențialitate',
      navTerms: 'Termeni',
      footPrivacy: 'Politica de confidențialitate',
      footTerms: 'Termeni de utilizare',
      footSupport: 'Asistență',
      footDisclaimer: 'Kinetempo nu este un dispozitiv medical și nu oferă sfaturi medicale.',
      heroTitle: 'Exerciții de fizioterapie, numărate cu voce tare.',
      heroLead:
        'Recuperarea este muncă la cronometru — ține opt secunde, relaxează patru, de douăzeci și cinci de ori — și de obicei o faci întins pe podea. Kinetempo dă fiecărui pas sunetul lui, ticăie ultimele trei secunde și continuă să numere cu ecranul blocat.',
      heroFigure:
        '<strong>Silueta este desenată pentru exercițiul tău.</strong> În picioare, așezat, întins — sunt unghiuri de articulații care se mișcă în ritmul pașilor tăi, nu un clip ales dintr-o listă.',
      ctaGet: 'Descarcă aplicația',
      ctaDemo: 'Încearcă în browser',
      ctaCatalog: 'Vezi catalogul',
      createTitle: 'Fă-ți propriul exercițiu în două minute',
      createLead:
        'Kinetempo nu este un set fix de antrenamente — este un cronometru pe care îl construiești, manual sau cu un asistent AI. Descrie exercițiul într-o conversație și primești un link care îl adaugă în aplicație, cu tot cu siluetă.',
      aiClaude: 'Creează cu Claude',
      aiChatgpt: 'Creează cu ChatGPT',
      aiCopy: 'Copiază solicitarea',
      aiCopied: 'Copiat — lipește-o în asistent',
      aiCopyManual: 'Selectează și copiază din caseta de mai jos',
      aiNote:
        'Claude și ChatGPT se deschid cu solicitarea deja scrisă; pentru altele, copiaz-o și lipește-o. Asistentul trebuie să poată deschide un link și să ruleze cod — fără ambele, trimite animația ca text, pe care îl lipești manual în exercițiu. Vrei doar o siluetă pentru un exercițiu pe care îl ai deja? Trimite-l la <a href="./animation-only.txt">ghidul de animație</a>, care nu cere deloc cod.',
      demoCaption:
        '<strong>De la cap la coadă.</strong> Două întrebări despre repetări și serii, apoi un link care deschide exercițiul gata făcut. Singurul lucru tăiat este jumătatea de minut în care a lucrat asistentul.',
      card1Title: '<span class="phase work">STRÂNGE</span> <span class="phase rest">RELAXEAZĂ</span>',
      card1Body:
        'Fiecare pas al unei repetări are culoarea, sunetul și poziția lui: strânge, ridică, ține, coboară, mișcă, odihnă. Ultimele trei secunde ticăie, așa că auzi ritmul fără să te uiți la ceas.',
      card2Title: 'Sunetul continuă cu ecranul blocat',
      card2Body:
        'Blochează telefonul sau pune-l cu ecranul în jos — semnalele continuă. iOS arată timpul rămas pe ecranul de blocare, Android o notificare cu numărătoare inversă.',
      card3Title: 'Îl construiești cum vrei',
      card3Body:
        'Alege o presetare — menținere izometrică, ridică · ține · coboară, repetări dinamice, cronometru simplu — sau scrie-ți propriii pași: tip, secunde, ticăit, etichetă. Exercițiile se adună într-un program, cu pauze între ele.',
      card4Title: 'Link, cod QR sau fișier',
      card4Body:
        'Tot programul călătorește în interiorul linkului — nimic nu se încarcă nicăieri — așa că fizioterapeutul îl dă pacientului dintr-o atingere. Trimite-l în <a href="./catalog/">catalogul public</a> și, odată acceptat, apare în Biblioteca tuturor.',
      card5Title: 'Confidențial din construcție',
      card5Body:
        'Totul rămâne pe telefonul tău: fără cont, fără urmărire. Aplicația iese în rețea pentru catalogul public — și pentru ce alegi tu să trimiți acolo. English, Русский, Română — cu tot cu sunete și etichete pe ecranul de blocare.',
      screensTitle: 'Ecrane',
      shot1: 'O menținere în desfășurare — culoare, numărătoare și siluetă',
      shot2: 'Un exercițiu scris de un asistent, cu tot cu siluetă',
      shot3: 'Un program: exerciții în ordine, cu pauze',
      shot4: 'Catalogul public, în aplicație',
      tryTitle: 'Încearcă în browser',
      tryBody: 'Playerul, rescris pentru web: aceiași pași, aceleași sunete, aceeași siluetă schematică. Fără instalare.',
      tryCta: 'Deschide demo',
      downloadTitle: 'Descărcare',
      downloadBody:
        'Linkurile App Store și Google Play apar aici după publicare. Până atunci, testerii pot cere o invitație TestFlight la <a href="mailto:es@defency.net">es@defency.net</a>.',
      demoDocTitle: "Kinetempo — încearcă cronometrul",
      demoTitle: "Încearcă cronometrul",
      demoLead: "Acesta este playerul aplicației, rescris pentru browser: același model de pași, aceleași sunete, aceeași siluetă schematică. Alege o presetare și apasă Start (sunetul cere o atingere).",
      demoNote: "În aplicație cronometrul merge și cu ecranul blocat, arată un Live Activity sau o notificare și conduce programe din mai multe exerciții. ",
      demoGet: "Descarcă aplicația",
      demoReady: "Gata?",
      demoPaused: "Pauză",
      demoDone: "Gata!",
      demoStart: "Start",
      demoPause: "Pauză",
      demoResume: "Continuă",
      demoAgain: "Din nou",
      demoSkip: "Sari",
      demoReset: "Resetează",
      demoReset: "Resetează",
      demoSession: "Sesiune",
      demoReps: "repetări",
      demoPresetSlr: "Ridicarea piciorului întins",
      demoPresetQuad: "Izometrie de cvadriceps",
      demoPresetHeel: "Alunecări cu călcâiul",
      demoPresetPumps: "Pompe de gleznă",
      demoPresetProp: "Călcâi ridicat (cronometru)",
      demoStepLock: "Blochează genunchiul",
      demoStepLower: "Coboară încet",
      demoStepIn: "Îndoaie (≤90°)",
      demoStepOut: "Întinde",
      demoStepUp: "Vârful spre tine",
      demoStepDown: "Vârful de la tine",
      demoStepHang: "Relaxează și lasă piciorul să atârne",
      supportDocTitle: "Kinetempo — asistență",
      supportTitle: "Asistență",
      supportIntro: "Scrieți la <a href=\"mailto:es@defency.net?subject=Kinetempo\">es@defency.net</a> sau deschideți un issue pe <a href=\"https://github.com/selic/kinetempo/issues\">GitHub</a>. Includeți modelul telefonului, versiunea sistemului și versiunea aplicației din Setări → Despre.",
      supportFaq: "Întrebări frecvente",
      supportQ1: "Ce arată widgetul de pe ecranul de blocare?",
      supportA1: "Timpul rămas din sesiune și pașii următori cu propriile numărători — ce poate desena iOS fără aplicație. iOS limitează cât de des o aplicație din fundal poate actualiza un Live Activity, așa că widgetul nu încearcă să reproducă fiecare pas: cu ecranul blocat, urmăriți sunetele. Widgetul se poate opri din Setări.",
      supportQ2: "Fără sunet cu butonul de silențios pornit",
      supportA2: "Kinetempo folosește categoria audio de redare, deci semnalele se aud și în modul silențios. Verificați volumul media și că Sunetele sunt pornite în Setări.",
      supportQ3: "Cum trimit un program unui pacient sau unui prieten?",
      supportA3: "Deschideți programul → Partajare. Trimiteți linkul, arătați codul QR sau exportați un fișier. Videoclipurile locale nu se includ; pentru video folosiți linkuri.",
      supportQ4: "Cum publică clinicile programe?",
      supportA4: "Vedeți <a href=\"https://github.com/selic/kinetempo-catalog/blob/main/docs/AUTHORING.md\">ghidul autorului</a>: creați un folder de editor, adăugați fișierele programelor, deschideți un pull request.",
      shareDocTitle: "Kinetempo — un program partajat",
      catalogDocTitle: "Catalog — Kinetempo",
      shareTitle: "Cineva ți-a trimis un program",
      shareLead: "Deschide-l în Kinetempo ca să imporți exercițiile. Datele programului trăiesc doar în acest link — nimic nu a fost încărcat nicăieri.",
      shareOpen: "Deschide în Kinetempo",
      shareGet: "Descarcă aplicația",
      demoTone_prep: "Pregătește-te",
      demoHint_prep: "Începem în curând…",
      demoTone_squeeze: "Contractă",
      demoHint_squeeze: "Menține, respiră",
      demoTone_hold: "Menține",
      demoHint_hold: "Ține poziția",
      demoTone_lift: "Ridică",
      demoHint_lift: "Ridică încet",
      demoTone_release: "Coboară",
      demoHint_release: "Coboară controlat",
      demoTone_move: "Mișcare",
      demoHint_move: "Mișcă pe toată amplitudinea",
      demoTone_timer: "Cronometru",
      demoHint_timer: "Continuă",
      demoTone_rest: "Relaxează",
      demoHint_rest: "Relaxează, expiră",
      aiPrompt:
        'Citește https://selic.github.io/kinetempo-catalog/anim-guide.txt și urmează-l ca să-mi faci un exercițiu Kinetempo cu animație.\n\nÎntreabă-mă ce ai nevoie despre mișcare, timpi și numărul de repetări, apoi răspunde cu linkul de import.',
    },
  };

  const asked = new URLSearchParams(location.search).get('lang');
  const stored = (() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null; // a browser that refuses storage still gets a language, just not a remembered one
    }
  })();
  const fromBrowser = (navigator.languages ?? [navigator.language ?? 'en']).map((l) => String(l).slice(0, 2)).find((l) => LANGS.includes(l));
  let current = [asked, stored, fromBrowser, 'en'].find((l) => LANGS.includes(l));

  /** The English page is the source, so its strings are read out of the markup once. */
  const english = new Map();
  T.en[document.body.dataset.titleKey ?? 'docTitle'] = document.title;

  function text(key) {
    return T[current]?.[key] ?? T.en[key];
  }

  /**
   * Keys this file knows about. The catalog page carries its own `data-i18n`
   * elements, translated by browse.js — some of them labels wrapped around a
   * `<select>`, which setting textContent would throw away. Anything not named
   * here belongs to somebody else and is left alone.
   */
  const MINE = new Set([...Object.keys(T.ru), ...Object.keys(T.ro)]);

  for (const el of document.querySelectorAll('[data-i18n]')) {
    if (MINE.has(el.dataset.i18n)) english.set(el, HTML.has(el.dataset.i18n) ? el.innerHTML : el.textContent);
  }

  function apply() {
    document.documentElement.lang = current;
    document.title = text(document.body.dataset.titleKey ?? 'docTitle') ?? document.title;
    for (const el of document.querySelectorAll('[data-i18n]')) {
      const key = el.dataset.i18n;
      if (!MINE.has(key)) continue;
      const value = T[current]?.[key] ?? english.get(el);
      if (value === undefined) continue;
      if (HTML.has(key)) el.innerHTML = value;
      else el.textContent = value;
    }
    for (const button of document.querySelectorAll('[data-lang-switch] button')) {
      button.setAttribute('aria-current', button.dataset.lang === current ? 'true' : 'false');
    }
  }

  function set(lang) {
    if (!LANGS.includes(lang) || lang === current) return;
    current = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* not remembering it is no reason to refuse the switch */
    }
    apply();
    dispatchEvent(new CustomEvent('kt:lang', { detail: lang }));
  }

  for (const host of document.querySelectorAll('[data-lang-switch]')) {
    host.hidden = false;
    host.innerHTML = LANGS.map((l) => `<button type="button" data-lang="${l}">${NAMES[l]}</button>`).join('');
    host.addEventListener('click', (ev) => {
      const button = ev.target.closest('button[data-lang]');
      if (button) set(button.dataset.lang);
    });
  }

  window.ktText = text;
  window.ktLang = () => current;
  window.ktSetLang = set;
  apply();
  // Inline scripts on the page run before this file does, so they start with the
  // English defaults; this tells them the language once it is known.
  dispatchEvent(new CustomEvent('kt:lang', { detail: current }));
})();
