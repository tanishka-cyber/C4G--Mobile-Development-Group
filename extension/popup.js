let currentAnalysis = {};

chrome.storage.session.get(["currentAnalysis"]).then((result) => {
  	if (result?.currentAnalysis) {
		currentAnalysis = result.currentAnalysis;
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
			loadingScreen.show();
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			if (tab?.url) {
				currentAnalysis = await analyzeURL(tab.url);
				console.log("BACKEND RESPONSE:", currentAnalysis);
				chrome.storage.session.set({ currentAnalysis: currentAnalysis });
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
			let file = hiddenFileInput.files[0];
			if (!file) return;
			loadingScreen.show();
			currentAnalysis = await analyzeFile(file);
			chrome.storage.session.set({ currentAnalysis: currentAnalysis });
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
		let urlInput = document.createElement("input");
		urlInput.placeholder = "https://example.com/...";
		urlInput.className = "url-enter";
		urlInput.id = "url";
		urlInput.name = "url";
		let analyzeButton = document.createElement("button");
		analyzeButton.textContent = "Analyze";
		analyzeButton.className = "analyze-button";
		analyzeButton.onclick = async () => {
			loadingScreen.show();
			currentAnalysis = await analyzeURL(urlInput.value);
			chrome.storage.session.set({ currentAnalysis: currentAnalysis });
			tabs[1].show();
		}
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
		let riskBox = document.createElement("div");
		riskBox.className = "key-points";

		let riskTitle = document.createElement("div");
		riskTitle.className = "key-points-title";
		riskTitle.textContent = " Risk Flags";

		let riskList = document.createElement("ul");
		riskList.className = "key-points-list";

		for (let risk of (currentAnalysis.risk_flags || [])) {
			let li = document.createElement("li");
			li.textContent = risk;
			riskList.appendChild(li);
		}

		riskBox.appendChild(riskTitle);
		riskBox.appendChild(riskList);

		contentElement.appendChild(riskBox);
		let recommendationBox = document.createElement("div");
		recommendationBox.className = "key-points";

		let recommendationTitle = document.createElement("div");
		recommendationTitle.className = "key-points-title";
		recommendationTitle.textContent = "Recommendations";

		let recommendationList = document.createElement("ul");
		recommendationList.className = "key-points-list";

		for (let recommendation of (currentAnalysis.recommendations || [])) {
			let li = document.createElement("li");
			li.textContent = recommendation;
			recommendationList.appendChild(li);
		}

		recommendationBox.appendChild(recommendationTitle);
		recommendationBox.appendChild(recommendationList);

		contentElement.appendChild(recommendationBox);
		contentElement.appendChild(summaryElement);

		return contentElement;
	}
}

class QuestionsScreen extends Screen {
	calculateContent() {
		return document.createElement("div");
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

let tabs = [];
tabs.push(new Tab("Home", new HomeScreen(), "fa-house"));
tabs.push(new Tab("Analysis", new AnalysisScreen(), "fa-magnifying-glass-chart"));
// tabs.push(new Tab("Questions", new QuestionsScreen(), "fa-comments"));

let tabsElement = document.getElementById("tabs");

tabs.forEach(e => {
	tabsElement.appendChild(e.makeButton());
});

tabs[0].show();

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