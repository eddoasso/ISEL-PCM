//Declaring a global variable which will be created in main function
let app = null;

let categoryRestriction = null;

function main() {
	let canvas = document.querySelector('canvas');

	//adding eventlisteners

	//funcao zooom
	canvas.addEventListener('dblclick', imgSearch, false);
	//drag & drop
	console.log('added event listener');
	//canvas.addEventListener('mousedown', beginDrag, false);
	//canvas.addEventListener('mouseup', endDrag, false);
	//canvas.addEventListener('mousemove', updateImg, false);

	document.getElementById('inputText').addEventListener('keypress', function(e) {
		if (e.key === 'Enter') {
			getImagesFromWord();
		}
	});
	//Creating the instance of the application
	app = new ISearchEngine('xml/Image_database.xml');

	// Initializing the app
	app.init(canvas);
}

function imgSearch(ev) {
	let img = clickImgEvent(ev);

	if (img !== null) {
		app.searchISimilarity(img, 'Manhattan');
	}
}

//variaveis em relacao ao drag, se calhar fazer uma classe propria
let draggingFlag = false;
let draggingImg = null;
let isOnDiv = false;
function beginDrag(evt) {
	evt.preventDefault();
	evt.stopPropagation();

	console.log('dragging');
	let img = clickImgEvent(evt);
	if (img !== null) {
		console.log('gonna drag');

		draggingFlag = true;
		draggingImg = new Picture(img.posx, img.posy, app.imgWidth, app.imgHeight, img.impath, 'dragging');
		document.getElementById('imageSearchBar').style.display = 'block';
		document.querySelector('canvas').style.opacity = 0.4;
		document.getElementById('inputText').style.display = 'none';
	}
}

function endDrag(e) {
	console.log('end drag');
	console.log(JSON.stringify(app.allpictures.stuff));
	if (draggingFlag) {
		let divRect = document.getElementById('imageSearchBar').getBoundingClientRect();
		let posx = e.clientX;
		let posy = e.clientY;
		if (posx >= divRect.left && posy >= divRect.top && posx <= divRect.bottom && posy <= divRect.right) {
			console.log('in');
			app.searchISimilarity(draggingImg, 'Manhattan');
		}

		draggingFlag = false;
		draggingImg = null;
		document.getElementById('imageSearchBar').style.display = 'none';
		let cnv = document.querySelector('canvas');
		cnv.style.opacity = 1;
		document.getElementById('inputText').style.display = 'inline-block';

		cnv.getContext('2d').clearRect(0, 0, cnv.width, cnv.height);
		grid();
	}
}

//Codigo do TP4, fornecido pelos docentes, adaptado
function updateImg(e) {
	if (draggingFlag) {
		let cnv = document.querySelector('canvas');
		cnv.clear;
		console.log('img moving');
		e.preventDefault();
		e.stopPropagation();

		//pos rato
		let xPos = 0;
		let yPos = 0;
		[ xPos, yPos ] = getMouseCoord(cnv);
		mouseX = e.x - xPos;
		mouseY = e.y - yPos;

		draggingImg.setPosition(mouseX, mouseY);

		//limpar e voltar a desenhar
		cnv.getContext('2d').clearRect(0, 0, cnv.width, cnv.height);
		grid();
		draggingImg.draw(cnv);
	}
}

function bigger(evt) {
	let img = clickImgEvent(evt);
	console.log('big event');
	if (img !== null) {
		let imgLoader = new Image();
		imgLoader.onload = function() {
			// assign onload handler
			let height = imgLoader.height;
			let width = imgLoader.width;

			let elem = document.getElementById('zoomIn');
			elem.style.width = width;
			elem.style.height = height;

			elem.src = img.impath;

			//show results
			document.getElementById('zoomInParent').style.display = 'block';
			elem.scrollIntoView({ behavior: 'smooth' });
		};

		imgLoader.src = img.impath; // set the image source
	}
}

//Mouse Coordinates for all browsers
//Codigo do TP4, fornecido pelos docentes

function getMouseCoord(el) {
	let xPos = 0;
	let yPos = 0;

	while (el) {
		if (el.tagName === 'BODY') {
			// deal with browser quirks with body/window/document and page scroll
			let xScroll = el.scrollLeft || document.documentElement.scrollLeft;
			let yScroll = el.scrollTop || document.documentElement.scrollTop;

			xPos += el.offsetLeft - xScroll + el.clientLeft;
			yPos += el.offsetTop - yScroll + el.clientTop;
		} else {
			// for all other non-BODY elements
			xPos += el.offsetLeft - el.scrollLeft + el.clientLeft;
			yPos += el.offsetTop - el.scrollTop + el.clientTop;
		}

		el = el.offsetParent;
	}
	return [ xPos, yPos ];
}

/**
 * este metodo encontra qual a imagem que foi clicada
 * nao usar se houver imagens sobrepostas
 */
function clickImgEvent(event) {
	let mx = 0;
	let my = 0;

	if (event.layerX || event.layerX === 0) {
		mx = event.layerX;
		my = event.layerY;
	} else if (event.offsetX || event.offsetX === 0) {
		mx = event.offsetX;
		my = event.offsetY;
	}
	let image = null;
	app.allpictures.stuff.forEach((img) => {
		if (img.mouseOver(mx, my)) {
			image = img;
		}
	});

	return image;
}

function offlineProcessing() {
	let canvas = document.querySelector('canvas');
	app.offlineProcessing(canvas);
}

function grid() {
	app.gridView(document.querySelector('canvas'));
}

/**
 *
 * @param {string} category categoria a ser procurada no localStorage
 *
 * Este metodo faz display no canvas das imagens da categoria
 */
function getImagesFromCategory(category) {
	if (localStorage.length === 0) {
		alert('Não há imagens processadas');
		return;
	}

	if (app.searchKeywords(category)) {
		categoryRestriction = category;
		let elem = document.getElementById('color-menu');
		elem.style.display = 'block';
	}
}

/**
 * Pesquisa por categoria, tendo em conta input do utilizador.
 * Avalia a proximidade das strings, usando uma biblioteca do JS incluida no ficheiro html
 * Casos especias incluiem urban, manmade e artificial que devido a ser categorias com um nome mais complexo necessitam de tais mordomias.
 */
function getImagesFromWord() {
	let val = document.getElementById('inputText').value.trim();

	if (val === null || val === '') {
		alert('Search bar cannot be empty');
		return;
	}

	let word = stringSimilarity.findBestMatch(val, app.categories).bestMatch.target;
	//casos especiais
	if (stringSimilarity.compareTwoStrings(val, 'urban') > 0.75) {
		word = 'manmade/urban';
	} else if (stringSimilarity.compareTwoStrings(val, 'manmade') > 0.75) {
		word = 'manmade/manmade';
	} else if (stringSimilarity.compareTwoStrings(val, 'artificial') > 0.75) {
		word = 'manmade/artificial';
	}

	if (stringSimilarity.compareTwoStrings(val, word) < 0.25) {
		getImagesFromCategory(val);
	} else {
		console.log(word);
		getImagesFromCategory(word);
	}
}
/**
 *
 * @param {string} color cor a pesquisar dentro da categoria definida anteriormente
 *
 * Pesquisa uma cor dentro de uma categoria. Se a categoria nao tiver sido selecionada, lanca uma excecao e um alert
 *
 */
function getImagesWithColorRestriction(color) {
	if (categoryRestriction === null) {
		alert('YOU SEEM TO HAVE FOUND A GLITCH IN THE MATRIX');
		return;
	}

	app.searchColor(categoryRestriction, color);
}

//Function that generates an artificial image and draw it in canvas
//Useful to test the image processing algorithms

function Generate_Image(canvas) {
	var ctx = canvas.getContext('2d');
	var imgData = ctx.createImageData(100, 100);

	for (var i = 0; i < imgData.data.length; i += 4) {
		imgData.data[i + 0] = 204;
		imgData.data[i + 1] = 0;
		imgData.data[i + 2] = 0;
		imgData.data[i + 3] = 255;
		if (
			(i >= 8000 && i < 8400) ||
			(i >= 16000 && i < 16400) ||
			(i >= 24000 && i < 24400) ||
			(i >= 32000 && i < 32400)
		)
			imgData.data[i + 1] = 200;
	}
	ctx.putImageData(imgData, 150, 0);
	return imgData;
}
