let currentAnalysis = {};

chrome.storage.session.get(["currentAnalysis"]).then((result) => {
	if (result?.currentAnalysis) {
		currentAnalysis = result.currentAnalysis;
		addAnalysisTabs();
	}
});

let screenElement = document.getElementById("screen");
let apiURL = "http://127.0.0.1:8000"

class Screen {
	show() {
		screenElement.innerHTML = "";
		screenElement.appendChild(this.calculateContent());
	}

	calculateContent() {
		return document.createElement("div");
	}
}

class HomeScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";
		let title = document.createElement("div");
		title.className = "title";
		title.textContent = "SimpleLens";
		let tagLine = document.createElement("div");
		tagLine.className = "tag-line";
		tagLine.textContent = "Know what you're agreeing to.";
		contentElement.appendChild(title);
		contentElement.appendChild(tagLine);
		let homeButtons = document.createElement("div");
		homeButtons.className = "home-buttons";
		let documentButton = document.createElement("button");
		documentButton.className = "home-button";
		documentButton.onclick = () => {
			uploadDocumentScreen.show();
		};
		documentButton.textContent = "Upload Document";
		let urlButton = document.createElement("button");
		urlButton.className = "home-button";
		urlButton.onclick = () => {
			enterURLScreen.show();
		};
		urlButton.textContent = "Enter URL";
		let currentPageButton = document.createElement("button");
		currentPageButton.className = "home-button";
		currentPageButton.onclick = async () => {
			removeAnalysisTabs();
			loadingScreen.show();
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (tab?.url) {
				currentAnalysis = await analyzeURL(tab.url);
				console.log("BACKEND RESPONSE:", currentAnalysis);
				chrome.storage.session.set({ currentAnalysis: currentAnalysis });

				if (currentAnalysis.success) addAnalysisTabs();

				tabs[1].show();
			} else {
				tabs[0].show();
			}
		};
		currentPageButton.textContent = "Analyze this Page";
		homeButtons.appendChild(documentButton);
		homeButtons.appendChild(urlButton);
		homeButtons.appendChild(currentPageButton);
		contentElement.appendChild(homeButtons);
		return contentElement;
	}
}

class UploadDocumentScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";
		let title = document.createElement("div");
		title.className = "page-title";
		title.textContent = "Upload Document";
		let documentInput = document.createElement("button");
		documentInput.className = "file-upload";
		documentInput.textContent = "Click to Upload File";
		let hiddenFileInput = document.createElement("input");
		hiddenFileInput.type = "file";
		documentInput.onclick = () => {
			hiddenFileInput.click();
		}
		hiddenFileInput.onchange = (event) => {
			if (event.target.files.length > 0) {
				documentInput.textContent = event.target.files[0].name;
				return;
			}
			documentInput.textContent = "Click to Upload File";
		}
		let analyzeButton = document.createElement("button");
		analyzeButton.textContent = "Analyze";
		analyzeButton.className = "analyze-button";
		analyzeButton.onclick = async () => {
			removeAnalysisTabs();
			let file = hiddenFileInput.files[0];
			if (!file) return;
			loadingScreen.show();
			currentAnalysis = await analyzeFile(file);
			chrome.storage.session.set({ currentAnalysis: currentAnalysis });

			if (currentAnalysis.success) addAnalysisTabs();

			tabs[1].show();
		}
		contentElement.appendChild(title);
		contentElement.appendChild(documentInput);
		contentElement.appendChild(analyzeButton);
		return contentElement;
	}
}

class EnterURLScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";
		let title = document.createElement("div");
		title.className = "page-title";
		title.textContent = "Enter URL";
		let analyze = async () => {
			removeAnalysisTabs();
			loadingScreen.show();
			currentAnalysis = await analyzeURL(urlInput.value);
			chrome.storage.session.set({ currentAnalysis: currentAnalysis });

			if (currentAnalysis.success) addAnalysisTabs();

			tabs[1].show();
		}
		let urlInput = document.createElement("input");
		urlInput.placeholder = "https://example.com/...";
		urlInput.className = "url-enter";
		urlInput.id = "url";
		urlInput.name = "url";
		urlInput.onkeydown = (e) => {
			if (e.key == "Enter") {
				analyze();
			}
		}
		let analyzeButton = document.createElement("button");
		analyzeButton.textContent = "Analyze";
		analyzeButton.className = "analyze-button";
		analyzeButton.onclick = analyze;
		contentElement.appendChild(title);
		contentElement.appendChild(urlInput);
		contentElement.appendChild(analyzeButton);
		return contentElement;
	}
}

class LoadingScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";
		let title = document.createElement("div");
		title.className = "title title-center";
		title.textContent = "SimpleLens";
		let spinner = document.createElement("div");
		spinner.className = "spinner";
		contentElement.appendChild(title);
		contentElement.appendChild(spinner);
		return contentElement;
	}
}

class AnalysisScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";
		let title = document.createElement("div");
		title.className = "page-title";
		title.textContent = "Analysis";
		contentElement.appendChild(title);
		if (!currentAnalysis || !currentAnalysis.success) {
			let error = document.createElement("div");
			error.className = "error";
			error.textContent = currentAnalysis?.error_message || "No Current Analysis Found";
			contentElement.appendChild(error);
			return contentElement;
		}
		let scoreBox = document.createElement("div");
		scoreBox.className = "score-box";
		scoreBox.style.setProperty("--score-color", currentAnalysis.score_color);
		let scoreRing = document.createElement("div");
		scoreRing.className = "score-ring";
		let scoreSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		scoreSVG.className.baseVal = "progress-ring";
		scoreSVG.setAttribute("viewBox", "0 0 100 100");
		let circleOne = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		circleOne.className.baseVal = "progress-bar-shadow";
		let circleTwo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		circleTwo.className.baseVal = "progress-bar";
		circleTwo.setAttribute("pathLength", 100);
		circleTwo.style.setProperty("--score", currentAnalysis.score);
		let score = document.createElement("div");
		score.textContent = currentAnalysis.score;
		score.className = "score-text";
		scoreRing.appendChild(score);
		scoreSVG.appendChild(circleOne);
		scoreSVG.appendChild(circleTwo);
		scoreRing.appendChild(scoreSVG);
		scoreBox.appendChild(scoreRing);
		let scoreInfo = document.createElement("div");
		scoreInfo.className = "score-info";
		let scoreTitle = document.createElement("div");
		scoreTitle.className = "score-name";
		scoreTitle.textContent = currentAnalysis.short_score;
		scoreInfo.appendChild(scoreTitle);
		scoreBox.appendChild(scoreInfo);
		let scoreSummary = document.createElement("div");
		scoreSummary.className = "score-summary";
		scoreSummary.textContent = currentAnalysis.long_score;
		let keyPoints = document.createElement("div");
		keyPoints.className = "key-points";
		let keyPointsTitle = document.createElement("div");
		keyPointsTitle.className = "key-points-title";
		keyPointsTitle.textContent = "Key Points";
		let keyPointsList = document.createElement("ul");
		keyPointsList.className = "key-points-list";
		for (let point of currentAnalysis.key_points) {
			let pointElement = document.createElement("li");
			pointElement.textContent = point;
			keyPointsList.appendChild(pointElement);
		}
		keyPoints.appendChild(keyPointsTitle);
		keyPoints.appendChild(keyPointsList);
		let summaryElement = document.createElement("p");
		summaryElement.className = "summary";
		summaryElement.textContent = currentAnalysis.summary;

		// Website metadata section (URL analysis)
		let metadata = document.createElement("div");
		metadata.className = "metadata";

		let metadataTitle = document.createElement("div");
		metadataTitle.className = "metadata-title";
		metadataTitle.textContent = "Website Information";

		let websiteName = document.createElement("div");
		websiteName.textContent = `Title: ${currentAnalysis.title || "Unknown"}`;

		let companyName = document.createElement("div");
		companyName.textContent = `Company: ${currentAnalysis.company || "Unknown"}`;

		let wordCount = document.createElement("div");
		wordCount.textContent = `Policy Length: ${currentAnalysis.word_count || 0} words`;

		let readingTime = document.createElement("div");
		readingTime.textContent = `Reading Time: ${currentAnalysis.reading_time || 0} minute(s)`;

		metadata.appendChild(metadataTitle);
		metadata.appendChild(websiteName);
		metadata.appendChild(companyName);
		metadata.appendChild(wordCount);
		metadata.appendChild(readingTime);

		contentElement.appendChild(metadata);
		contentElement.appendChild(scoreBox);
		contentElement.appendChild(scoreSummary);
		contentElement.appendChild(keyPoints);
		contentElement.appendChild(summaryElement);

		let downloadButton = document.createElement("button");
		downloadButton.textContent = "Export PDF Report 📄";
		downloadButton.className = "analyze-button wide";

		downloadButton.onclick = () => {

			let reportWindow = window.open("", "_blank");

			reportWindow.document.write(`
		<html>
		<head>
			<title>SimpleLens Privacy Report</title>
			<style>
				body {
					font-family: Arial;
					padding: 40px;
				}

				h1 {
					color: #333;
				}

				.section {
					margin-bottom: 20px;
				}
			</style>
		</head>

		<body>

		<h1>SimpleLens Privacy Report</h1>

		<div class="section">
			<h2>Website</h2>
			<p>${currentAnalysis.title || "Unknown"}</p>
		</div>

		<div class="section">
			<h2>Company</h2>
			<p>${currentAnalysis.company || "Unknown"}</p>
		</div>

		<div class="section">
			<h2>Privacy Score</h2>
			<p>${currentAnalysis.score}/100 (${currentAnalysis.short_score})</p>
		</div>

		<div class="section">
			<h2>Summary</h2>
			<p>${currentAnalysis.long_score}</p>
		</div>

		<div class="section">
			<h2>Key Points</h2>
			<ul>
				${currentAnalysis.key_points.map(x => `<li>${x}</li>`).join("")}
			</ul>
		</div>

		<div class="section">
			<h2>Risk Flags</h2>
			<ul>
				${currentAnalysis.risk_flags.map(x => `<li>${x}</li>`).join("")}
			</ul>
		</div>

		<div class="section">
			<h2>Recommendations</h2>
			<ul>
				${currentAnalysis.recommendations.map(x => `<li>${x}</li>`).join("")}
			</ul>
		</div>

		</body>
		</html>
	`);

			reportWindow.document.close();

			reportWindow.print();

		};

		contentElement.appendChild(downloadButton);

		let forgetButton = document.createElement("button");
		forgetButton.innerHTML = "Forget My Data 🗑️";
		forgetButton.className = "analyze-button wide";

		forgetButton.onclick = () => {
			chrome.storage.session.remove("currentAnalysis");

			removeAnalysisTabs();

			currentAnalysis = {};

			alert("Your analysis data has been deleted.");

			tabs[0].show();
		};

		contentElement.appendChild(forgetButton);

		return contentElement;
	}
}


class RisksScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";

		let title = document.createElement("div");
		title.className = "page-title";
		title.textContent = "Risk Flags 🚩";

		contentElement.appendChild(title);

		let list = document.createElement("ul");
		list.className = "key-points-list";

		for (let risk of currentAnalysis.risk_flags || []) {
			let item = document.createElement("li");
			item.textContent = risk;
			list.appendChild(item);
		}

		contentElement.appendChild(list);

		return contentElement;
	}
}


class RecommendationsScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";

		let title = document.createElement("div");
		title.className = "page-title";
		title.textContent = "Recommendations 💡";

		contentElement.appendChild(title);

		let list = document.createElement("ul");
		list.className = "key-points-list";

		for (let recommendation of currentAnalysis.recommendations || []) {
			let item = document.createElement("li");
			item.textContent = recommendation;
			list.appendChild(item);
		}

		contentElement.appendChild(list);

		return contentElement;
	}
}


class QuickFactsScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";

		let title = document.createElement("div");
		title.className = "page-title";
		title.textContent = "Quick Facts 📋";

		contentElement.appendChild(title);

		let list = document.createElement("ul");
		list.className = "key-points-list";

		for (let fact of currentAnalysis.quick_facts || []) {
			let item = document.createElement("li");
			item.textContent = fact;
			list.appendChild(item);
		}

		contentElement.appendChild(list);

		return contentElement;
	}
}

class BreakdownScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";

		let title = document.createElement("div");
		title.className = "page-title";
		title.textContent = "Privacy Breakdown 📊";

		contentElement.appendChild(title);

		let breakdown = currentAnalysis.privacy_breakdown || {};

		for (let category in breakdown) {
			let item = document.createElement("div");
			item.className = "key-points";

			let categoryName = document.createElement("div");
			categoryName.className = "key-points-title";
			categoryName.textContent = category;

			let score = document.createElement("div");
			score.className = "breakdown-score";
			score.textContent = breakdown[category] + "/100";

			item.appendChild(categoryName);
			item.appendChild(score);

			contentElement.appendChild(item);
		}

		return contentElement;
	}
}


class QuestionsScreen extends Screen {
	calculateContent() {
		let contentElement = document.createElement("div");
		contentElement.className = "page";

		let title = document.createElement("div");
		title.className = "page-title";
		title.textContent = "Ask SimpleLens 🤖";

		let description = document.createElement("div");
		description.className = "summary";
		description.textContent =
			"Ask questions about the privacy policy you just analyzed.";

		let chatBox = document.createElement("div");
		chatBox.className = "chat-box";

		let messages = document.createElement("div");
		messages.className = "chat-messages";

		let input = document.createElement("textarea");

		input.className = "chat-input";
		input.placeholder = "Example: Can they sell my data?";

		let suggestions = [
			{ text: "Sell my data?", icon: "💰" },
			{ text: "What data is collected?", icon: "📋" },
			{ text: "Delete my account?", icon: "🗑️" },
			{ text: "Shared with advertisers?", icon: "📢" }
		];

		let suggestionBox = document.createElement("div");
		suggestions.forEach((suggestion) => {
			let button = document.createElement("button");
			button.className = "suggestion-button";
			button.textContent = `${suggestion.icon} ${suggestion.text}`;

			button.onclick = () => {
				input.value = suggestion.text;
			};

			suggestionBox.appendChild(button);
		});


		let sendButton = document.createElement("button");
		sendButton.className = "analyze-button";
		sendButton.textContent = "Send";
		
	sendButton.onclick = async () => {
		if (!input.value.trim()) return;

		suggestionBox.style.display = "none";

		let question = input.value;

		let userMessage = document.createElement("div");
		userMessage.className = "chat-user-message";
		userMessage.textContent = question;

		messages.appendChild(userMessage);

		input.value = "";

		let loadingMessage = document.createElement("div");
		loadingMessage.className = "typing-indicator";

		loadingMessage.innerHTML = `
			<span></span>
			<span></span>
			<span></span>
		`;

		messages.appendChild(loadingMessage);

		let response = await askChatbot(question);

		loadingMessage.remove();

		let aiMessage = document.createElement("div");
		aiMessage.className = "chat-ai-message";
		aiMessage.textContent = response.answer || "No response received.";

		messages.appendChild(aiMessage);

		messages.scrollTop = messages.scrollHeight;
	};

		chatBox.appendChild(messages);
		chatBox.appendChild(input);
		chatBox.appendChild(sendButton);

		contentElement.appendChild(title);
		contentElement.appendChild(description);
		contentElement.appendChild(suggestionBox);
		contentElement.appendChild(chatBox);

		return contentElement;
	}
}

class Tab {
	constructor(name, screen, icon) {
		this.name = name;
		this.screen = screen;
		this.icon = icon;
	}

	makeButton() {
		let button = document.createElement("button");
		button.className = "tab";

		if (this.dynamic) {
			button.classList.add("dynamic-tab");
		}
		this.button = button;
		let icon = document.createElement("i");
		icon.className = `tab-icon fa-solid ${this.icon}`;
		let name = document.createElement("span");
		name.className = "tab-name";
		name.textContent = this.name;
		button.appendChild(icon);
		button.appendChild(name);
		button.onclick = () => {
			this.show();
		}
		return button;
	}

	show() {
		this.screen.show();
		[...document.querySelectorAll(".tab.selected")].forEach(e => {
			e.classList.remove("selected");
		});
		if (this.button) {
			this.button.classList.add("selected");
		}
	}
}

let uploadDocumentScreen = new UploadDocumentScreen();
let enterURLScreen = new EnterURLScreen();
let loadingScreen = new LoadingScreen();

let risksScreen = new RisksScreen();
let recommendationsScreen = new RecommendationsScreen();
let quickFactsScreen = new QuickFactsScreen();
let breakdownScreen = new BreakdownScreen();

let tabs = [];

let homeTab = new Tab("Home", new HomeScreen(), "fa-house");
let analysisTab = new Tab("Analysis", new AnalysisScreen(), "fa-magnifying-glass-chart");

tabs.push(homeTab);
tabs.push(analysisTab);

let riskTab = new Tab(
	"Risks",
	new RisksScreen(),
	"fa-triangle-exclamation"
);
riskTab.dynamic = true;

let recommendationTab = new Tab(
	"Advice",
	new RecommendationsScreen(),
	"fa-lightbulb"
);
recommendationTab.dynamic = true;

let factsTab = new Tab(
	"Facts",
	new QuickFactsScreen(),
	"fa-list"
);
factsTab.dynamic = true;

let breakdownTab = new Tab(
	"Breakdown",
	breakdownScreen,
	"fa-chart-simple"
);
breakdownTab.dynamic = true;

tabs.push(riskTab);
tabs.push(recommendationTab);
tabs.push(factsTab);
tabs.push(breakdownTab);

let chatTab = new Tab(
	"Ask AI",
	new QuestionsScreen(),
	"fa-comments"
);
chatTab.dynamic = true;

tabs.push(chatTab);

let tabsElement = document.getElementById("tabs");

tabs.forEach(e => {
	tabsElement.appendChild(e.makeButton());
});

tabs[0].show();

function addAnalysisTabs() {
	tabsElement.classList.add("show-dynamic");
}


function removeAnalysisTabs() {
    tabsElement.classList.remove("show-dynamic");
}


async function analyzeURL(url) {
	try {
		let api = apiURL + "/url/";
		let res = await fetch(api, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"url": url
			})
		});
		return await res.json();
	} catch (e) {
		return { success: false, error_message: "Failed to fetch analysis" };
	}
}

async function analyzeFile(file) {
	try {
		let api = apiURL + "/document/";
		const formData = new FormData();
		formData.append("file", file);
		let res = await fetch(api, {
			method: "POST",
			body: formData
		});
		return await res.json();
	} catch (e) {
		return { success: false, error_message: "Failed to fetch analysis" };
	}
}

async function askChatbot(question) {
	try {
		let api = apiURL + "/chat/";

		let res = await fetch(api, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				question: question,
				analysis: currentAnalysis
			})
		});

		return await res.json();

	} catch (e) {
		return {
			success: false,
			answer: "Failed to connect to chatbot."
		};
	}
}

window.addEventListener("unload", () => {
	chrome.storage.session.remove("currentAnalysis");
});