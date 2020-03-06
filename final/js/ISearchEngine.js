'use strict';

class ISearchEngine {
	constructor(dbase) {
		//Array of color to be used in image processing algorithms
		this.colors = [
			'red',
			'orange',
			'yellow',
			'green',
			'blue-green',
			'blue',
			'purple',
			'pink',
			'white',
			'grey',
			'black',
			'brown'
		];

		// Red component of each color
		this.redColor = [ 204, 251, 255, 0, 3, 0, 118, 255, 255, 153, 0, 136 ];
		// Green component of each color
		this.greenColor = [ 0, 148, 255, 204, 192, 0, 44, 152, 255, 153, 0, 84 ];
		// Blue component of each color
		this.blueColor = [ 0, 11, 0, 0, 198, 255, 167, 191, 255, 153, 0, 24 ];

		//List of categories available in the image database
		this.categories = [
			'beach',
			'birthday',
			'face',
			'indoor',
			'manmade/artificial',
			'manmade/manmade',
			'manmade/urban',
			'marriage',
			'nature',
			'no_people',
			'outdoor',
			'party',
			'people',
			'snow'
		];

		//Name of the XML file with the information related to the images
		this.XML_file = dbase;

		// Instance of the XML_Database class to manage the information in the XML file
		this.XML_db = new XML_Database();

		// Instance of the LocalStorageXML class to manage the information in the LocalStorage
		this.LS_db = new LocalStorageXML();

		//Number of images per category for image processing
		this.num_Images = 100;

		//Number of images to show in canvas as a search result
		this.numshownpic = 30;

		//Width of image in canvas
		this.imgWidth = 190;
		//Height of image in canvas
		this.imgHeight = 140;

		//Pool to include all the objects (mainly pictures) drawn in canvas
		this.allpictures = new Pool(this.num_Images * this.categories.length);

		//Canvas
		this.canvas = null;

		//Variavel para debug
		this.testing1image = false;
	}

	//Method to initialize the canvas. First stage it is used to process all the images
	init(cnv) {
		this.canvas = cnv;

		//Drawing the default picture
		let img = new Picture(0, 0, 1100, 1100, 'Images/cnv_back.png', 'default');
		img.draw(canvas);
	}
	offlineProcessing() {
		this.allpictures.empty_Pool();
		let ctx = this.canvas.getContext('2d');
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.databaseProcessing(this.canvas);
	}

	// method to build the database which is composed by all the pictures organized by the XML_Database file
	// At this initial stage, in order to evaluate the image algorithms, the method only compute one image.
	// However, after the initial stage the method must compute all the images in the XML file

	databaseProcessing(cnv) {
		let h12color = new ColorHistogram(this.redColor, this.greenColor, this.blueColor);
		let colmoments = new ColorMoments();

		let XMLdoc = this.XML_db.loadXMLfile(this.XML_file);

		if (this.testing1image) {
			let path = 'Images/daniel1.jpg';
			let img = new Picture(0, 0, 100, 100, path, 'teste');
			let eventname = 'processed_picture_' + path;
			let eventP = new Event(eventname);
			let self = this;
			document.addEventListener(
				eventname,
				function() {
					self.imageProcessed(img, eventname);
				},
				false
			);
			img.computation(cnv, h12color, colmoments, eventP);
		} else {
			const self = this;
			this.categories.forEach((categoria) => {
				let imagesPaths = self.XML_db.SearchXML(categoria, XMLdoc, self.num_Images);
				imagesPaths.forEach((path) => {
					let img = new Picture(0, 0, self.imgHeight, self.imgHeight, path, categoria);
					let eventname = 'processed_picture_' + img.impath;
					let eventP = new Event(eventname);

					document.addEventListener(
						eventname,
						function() {
							self.imageProcessed(img, eventname);
						},
						false
					);
					img.computation(cnv, h12color, colmoments, eventP);
				});
			});
		}
	}
	//When the event "processed_picture_" is enabled this method is called to check if all the images are
	//already processed. When all the images are processed, a database organized in XML is saved in the localStorage
	//to answer the queries related to Color and Image Example
	imageProcessed(img, eventname) {
		this.allpictures.insert(img);
		console.log('image processed ' + this.allpictures.stuff.length + eventname);
		if (this.allpictures.stuff.length === this.num_Images * this.categories.length) {
			alert('fim do processamento');
			this.createXMLColordatabaseLS();
			this.createXMLIExampledatabaseLS();
		}
	}
	/**
   * Method to create the XML database in the localStorage for color queries
   *
   * este metodo procura cria uma entrada no localstorage para cada categoria, tendo lá dentro as imagens ordenadas por cor.
   * ordenar por cor pode ser removido, que á partida o metodo faria o mesmo. No entanto pode permitir uma busca mais rapida mais em diante
   *
   */
	createXMLColordatabaseLS() {
		const self = this;

		this.categories.forEach((categoria) => {
			let images = self.allpictures.stuff.filter((image) => {
				return image.category === categoria;
			});

			let valToSave = '<images>\n';

			self.colors.forEach((color) => {
				self.sortbyColor(self.colors.indexOf(color), images);

				images.forEach((image) => {
					valToSave += '<image class="' + color + '">\n<path>';
					valToSave += image.impath + '</path>\n' + '</image>\n';
				});
			});

			valToSave += '</images>';
			self.LS_db.saveLS_XML(categoria, valToSave);
		});
	}
	/**
   *	Method to create the XML database in the localStorage for Image Example queries
   */
	createXMLIExampledatabaseLS() {
		this.zscoreNormalization();
		for (let i = 0; i < this.allpictures.stuff.length; i++) {
			for (let j = 0; j < this.allpictures.stuff.length; j++) {
				let distancia = this.calcManhattanDist(this.allpictures.stuff[i], this.allpictures.stuff[j]);
				this.allpictures.stuff[i].manhattanDist.push(distancia);
			}
		}
		let imagens = this.allpictures.stuff.slice();
		for (let i = 0; i < this.allpictures.stuff.length; i++) {
			let xmlRowString = '<images>';
			this.sortbyManhattanDist(i, imagens);
			for (let x = 0; x < this.numshownpic; x++) {
				xmlRowString += '<image class="Manhattan"><path>' + imagens[x].impath + '</path></image>';
			}
			xmlRowString += '</images>';
			this.LS_db.saveLS_XML(this.allpictures.stuff[i].impath, xmlRowString);
		}
	}

	//A good normalization of the data is very important to look for similar images. This method applies the
	// zscore normalization to the data
	zscoreNormalization() {
		let overall_mean = [];
		let overall_std = [];

		// Inicialization
		for (let j = 0; j < this.allpictures.stuff[0].color_moments.length; j++) {
			overall_mean.push(0);
			overall_std.push(0);
		}

		// Mean computation I
		for (let j = 0; j < this.allpictures.stuff.length; j++) {
			for (let j = 0; j < this.allpictures.stuff[0].color_moments.length; j++) {
				overall_mean[j] += this.allpictures.stuff[j].color_moments[j];
			}
		}

		// Mean computation II
		for (let j = 0; j < this.allpictures.stuff[0].color_moments.length; j++) {
			overall_mean[j] /= this.allpictures.stuff.length;
		}

		// STD computation I
		for (let j = 0; j < this.allpictures.stuff.length; j++) {
			for (let j = 0; j < this.allpictures.stuff[0].color_moments.length; j++) {
				overall_std[j] += Math.pow(this.allpictures.stuff[j].color_moments[j] - overall_mean[j], 2);
			}
		}

		// STD computation II
		for (let j = 0; j < this.allpictures.stuff[0].color_moments.length; j++) {
			overall_std[j] = Math.sqrt(overall_std[j] / this.allpictures.stuff.length);
		}

		// zscore normalization
		for (let j = 0; j < this.allpictures.stuff.length; j++) {
			for (let j = 0; j < this.allpictures.stuff[0].color_moments.length; j++) {
				this.allpictures.stuff[j].color_moments[j] =
					(this.allpictures.stuff[j].color_moments[j] - overall_mean[j]) / overall_std[j];
			}
		}
	}

	/**
   *
   * @param {string} category categoria, deve estar guardada no manager, depois de ter sido selecionada pelo utilizador
   * @param {string} color cor, é passada como argumento no html
   *
   * Method to search images based on a selected color
   */
	searchColor(category, color) {
		// this method should be completed by the students
		let XMLdoc = this.LS_db.readLS_XML(category);
		let images = this.XML_db.SearchXML(color, XMLdoc, this.numshownpic);

		this.atualizarPool(images);
		this.gridView(this.canvas);
	}

	/**
   * Method to search images based on keywords
   * @param {string} categoryToFind
   */

	searchKeywords(category) {
		try {
			let XMLdoc = this.XML_db.loadXMLfile(this.XML_file);
			let images = this.XML_db.SearchXML(category, XMLdoc, this.numshownpic);

			this.atualizarPool(images, category);
			this.gridView(this.canvas);
			return true;
		} catch (TypeError) {
			alert(category + ' Não teve resultados');
			return false;
			//TODO adicionar som (ping)
		}
	}

	/**
   * Method to search images based on Image similarities
   * @param {Image_Processing.Picture} IExample - Imagem a ser comparada
   * @param {int} dist - Nao faco ideia
   */

	searchISimilarity(IExample, dist) {
		console.log('searchIsimilarity' + IExample.impath);
		let XMLdoc = this.LS_db.readLS_XML(IExample);
		let images = this.XML_db.SearchXML(dist, XMLdoc, this.numshownpic);

		this.atualizarPool(images, IExample.category);
		this.gridView(this.canvas);
	}

	/**
   * Method to compute the Manhattan difference between 2 images which is one way of measure the similarity
   * between images.
   * @param {Image_Processing.Picture} img1
   * @param {Image_Processing.Picture} img2
   */

	calcManhattanDist(img1, img2) {
		let manhattan = 0;

		for (let j = 0; j < img1.color_moments.length; j++) {
			manhattan += Math.abs(img1.color_moments[j] - img2.color_moments[j]);
		}
		manhattan /= img1.color_moments.length;
		return manhattan;
	}

	//Method to sort images according to the Manhattan distance measure
	sortbyManhattanDist(idxdist, list) {
		// this method should be completed by the students
		list.sort(function(a, b) {
			return b.manhattanDist[idxdist] - a.manhattanDist[idxdist];
		});
	}

	//Method to sort images according to the number of pixels of a selected color
	sortbyColor(idxColor, list) {
		list.sort(function(a, b) {
			return b.hist[idxColor] - a.hist[idxColor];
		});
	}

	//Method to visualize images in canvas organized in columns and rows
	gridView(cnv) {
		cnv.getContext('2d').clearRect(0, 0, cnv.width, cnv.height);
		let numColunas = 5;
		let numLinhas = 6;

		let counter = 0;
		let w = cnv.width / numColunas;
		let h = cnv.height / numLinhas;

		for (let i = 0; i < numLinhas; i++) {
			for (let j = 0; j < numColunas; j++) {
				this.allpictures.stuff[counter].setPosition(j * w + 15, i * h + 15);
				this.allpictures.stuff[counter].draw(cnv);
				counter++;
			}
		}
	}
	/**
   *
   * @param {string[]} imagesPaths paths das imagens, resultado da pesquisa no localstorage ou no xml
   *
   * Este metodo apaga o pool e insere novas imagens, permitindo que seja desenhado no canvas novos resultados
   */
	atualizarPool(imagesPaths, category) {
		let self = this;
		self.allpictures.empty_Pool();
		imagesPaths.forEach((im) => {
			self.allpictures.insert(new Picture(0, 0, self.imgWidth, self.imgHeight, im, category));
		});
	}
}

class Pool {
	constructor(maxSize) {
		this.size = maxSize;
		this.stuff = [];
	}

	insert(obj) {
		if (this.stuff.length < this.size) {
			this.stuff.push(obj);
		} else {
			alert("The application is full: there isn't more memory space to include objects");
		}
	}

	remove() {
		if (this.stuff.length !== 0) {
			this.stuff.pop();
		} else {
			alert("There aren't objects in the application to delete");
		}
	}

	empty_Pool() {
		while (this.stuff.length > 0) {
			this.remove();
		}
	}
}
