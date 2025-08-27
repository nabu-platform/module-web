// considerations:
// colspans
// rowspans (for row grouping)
// tbody, tr, td correct elements

nabu.page.provide("page-type", {
	name: "table-page",
	rowTag: function(row, depth, editing, reversePath, page) {
		if (row.rendererSlot == "body") {
			return "tbody";
		}
		// if we have a row that is set to "body", the cells inside it become the table rows
		// at that point the rows inside that cell become the "td"
		else if (reversePath.length >= 3 && reversePath[2].rendererSlot == "body") {
			return "renderer-table-body-cell";
		}
		// it must be inside the table, this goes for header, footer & body, for example for body depth:
		// <column> <repeat> <table>
		var isRow = reversePath.length >= 2 && reversePath[1].renderer == "table";
		// in a repeat (e.g. the body), you are in a page fragment
		// to be a valid cell INSIDE a table, you need at least 3 levels
		// the repeat spins off a fragment page with the correct page type (e.g. table), but not the necessary depth
		isRow |= reversePath.length == 1;
		if (isRow) {
			// if the repeat type is CELL, we assume that you have a repeat inside the header!
			// this means you have a singular header row (no repeat) and within that a cell that has a repeat
			// the repeat has to be ON this cell though, not some faraway parent cell
			if (page.content.repeatType == "cell" && row.repeat) {
				return "th";
			}
			return "tr";
		}
		else {
			return null;
		}
	},
	cellTag: function(row, cell, depth, editing, reversePath, page) {
		// we are repeating in the header (or footer) a cell, the row is already tagged as a cell, we don't need this here
		// note that the repeat has to be ON this cell though
		if (page.content.repeatType == "cell" && cell.repeat) {
			return null;
		}
		// if we are inside a body repeat, we need a tr
		else if (reversePath.length >= 2 && reversePath[1].rendererSlot == "body") {
			return "tr";
		}
		// it must be inside the table, this goes for header, footer & body, for example for body depth:
		// <column> <repeat> <table>
		var isColumn = reversePath.length >= 3 && reversePath[2].renderer == "table";
		// in a repeat (e.g. the body), you are in a page fragment
		// to be a valid cell INSIDE a table, you need at least 3 levels
		// the repeat spins off a fragment page with the correct page type (e.g. table), but not the necessary depth
		isColumn |= reversePath.length == 2;
		var isHeader = isColumn && reversePath.length >= 2 && reversePath[1].rendererSlot == "header";
		if (isHeader) {
			return "renderer-table-header-cell";
		}
		else if (isColumn) {
			return "renderer-table-body-cell";
		}
		else {
			return null;
		}
	},
	repeatTag: function(target) {
		return "tbody";
	},
	cellComponent: function(cell, reversePath, page) {
		// see above
		if (page.content.repeatType == "cell" && cell.repeat) {
			return null;
		}
		// if we are inside a body repeat, we need a tr
		else if (reversePath.length >= 2 && reversePath[1].rendererSlot == "body") {
			return "table-row";
		}
		var isColumn = reversePath.length >= 3 && reversePath[2].renderer == "table";
		isColumn |= reversePath.length == 2;
		return isColumn ? "table-column" : null;
	},
	rowComponent: function(cell, reversePath, page) {
		var isRow = reversePath.length >= 2 && reversePath[1].renderer == "table";
		isRow |= reversePath.length == 1;
		if (isRow && page.content.repeatType == "cell") {
			return "table-column";
		}
		else if (reversePath.length >= 3 && reversePath[2].rendererSlot == "body") {
			return "table-column";
		}
		return isRow ? "table-row" : null;
	},
	repeatComponent: function(target) {
		return "table-body"
	},
	messageTag: function(target) {
		return "renderer-table-message";
	}
});

// 1-deep, we assume you have a dynamic repeat WITHIN the repeat of your body
// note that nested repeats in headers and footers are not supported atm
nabu.page.provide("page-type", {
	name: "table-page-child",
	rowTag: function(row, depth, editing, reversePath) {
		//return reversePath.length == 1 ? "td" : null;	
	},
	rowComponent: function(cell, reversePath) {
		//return reversePath.length == 1 ? "table-column" : null;	
	}
});

// table should expose action to "order by" (takes a list)
// we can use click events on the columns to trigger an action on the table to order by
// the orderby should also be exposed as state? we can check if a certain field is ordered by and in which direction
// we can use this to conditionally render the sort icon

nabu.page.provide("page-renderer", {
	title: "Table",
	name: "table",
	type: ["cell"],
	component: "renderer-table",
	configuration: "renderer-table-configure",
	cssComponent: "table",
	getChildComponents: function(target) {
		return [{
			title: "Table",
			name: "table",
			component: "table"
		}];
	},
	getPageType: function(target) {
		return "table-page";
	},
	getSlots: function(target) {
		return ["header", "body", "footer"];
	},
	// cells can have colspans!
	getChildConfig: function(target, child, reversePath) {
		if (child.rows) {
			return "renderer-table-cell-configure";
		}
		else if (child.cells && reversePath.length >= 3 && reversePath[2].rendererSlot == "body") {
			return "renderer-table-cell-configure";
		}
	}
});


Vue.component("renderer-table", {
	template: "#renderer-table",
	props: {
		page: {
			type: Object,
			required: true
		},
		// the target (cell or row)
		target: {
			type: Object,
			required: true
		},
		// whether or not we are in edit mode (we can do things slightly different)
		edit: {
			type: Boolean,
			required: false
		},
		childComponents: {
			type: Object,
			required: false
		}
	},
	methods: {
		hasDefaultElements: function() {
			var children = this.target.rows ? this.target.rows : this.target.cells;
			return children && children.filter(function(x) {
				return !x.rendererSlot;
			}).length > 0;
		}
	}
});


Vue.component("renderer-table-configure", {
	template: "#renderer-table-configure"	
});

Vue.component("renderer-table-cell-configure", {
	template: "#renderer-table-cell-configure",
	props: {
		cell: {
			type: Object
		},
		row: {
			type: Object
		},
		page: {
			type: Object
		}
	},
	data: function() {
		return {
			target: null
		}
	},
	created: function() {
		if (this.cell) {
			this.target = this.cell;
		}
		else if (this.row) {
			this.target = this.row;
		}
		if (this.target && !this.target.table) {
			Vue.set(this.target, "table", {});
		}
	}
});

Vue.component("renderer-table-message", {
	template: "#renderer-table-message",
	props: {
		target: {
			type: Object
		},
		page: {
			type: Object
		}
	}
});


Vue.component("renderer-table-body-cell", {
	template: "#renderer-table-body-cell",
	props: {
		target: {
			type: Object
		},
		page: {
			type: Object
		}
	},
	data: function() {
		return {
			elementPromise: null
		}
	},
	created: function() {
		this.elementPromise = this.$services.q.defer();
	},
	ready: function() {
		this.elementPromise.resolve(this.$el);
	},
	computed: {
		// TODO: if colspan is 0, calculate the amount of columns!
		colspan: function() {
			return this.target && this.target.table ? this.target.table.colspan : null;
		},
		label: function() {
			if (this.target && this.target.table && this.target.table.embeddedLabel) {
				return this.$services.page.interpret(this.$services.page.translate(this.target.table.embeddedLabel), this)
			}
			else {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				var originalPageInstance = pageInstance;
				// we are in the body, which is (presumably) a repeat
				// if so, we are in a fragment page that does not have full overview of the content
				// let's check the fragment parent for the real content
				// note that this does not work with nested repeats...(yet)
				pageInstance = this.$services.page.getRootPage(pageInstance);
/*				if (pageInstance.fragmentParent) {
					pageInstance = pageInstance.fragmentParent;
				}*/
				var path = this.$services.page.getTargetPath(pageInstance.page.content, this.target.id);
				// the parent should be the body repeat
				// the grandparent should be the table
				if (path.length >= 2) {
					var table = path[path.length - 3];
					// TODO: not yet for repeating tbody setups
					if (!table.rows) {
						return null;
					}
					var headerRow = table.rows.filter(function(x) {
						return x.rendererSlot == "header";
					})[0];
					// only proceed if we have a header row to look at					
					if (headerRow) {
						// calculate the correct colspan for ourselves
						var parent = path[path.length - 2];
						var ourIndex = parent.cells.indexOf(path[path.length - 1]);
						var colspan = 0;
						for (var i = 0; i <= ourIndex; i++) {
							if (parent.cells[i].table && parent.cells[i].table.colspan) {
								colspan += parseInt(parent.cells[i].table.colspan);
							}
							else {
								colspan++;
							}
						}
						var headerColspan = 0;
						var cellToUse = null;
						// check the cell that corresponds to this colspan
						for (var i = 0; i < headerRow.cells.length; i++) {
							if (headerRow.cells[i].table && headerRow.cells[i].table.colspan) {
								headerColspan += parseInt(headerRow.cells[i].table.colspan);
							}
							else {
								headerColspan++;
							}
							// as long as our colspan is OK, we set this cell
							if (headerColspan <= colspan) {
								cellToUse = headerRow.cells[i];
							}
							else {
								break;
							}
						}
						// we need a cell
						if (cellToUse) {
							// we want a typography-enabled content
							if (cellToUse.state.content) {
								return this.$services.typography.replaceVariables(originalPageInstance, cellToUse.state, cellToUse.state.content, this.elementPromise);
							}
						}
					}
				}
			}
			return null;
		}
	}
});


Vue.component("renderer-table-header-cell", {
	template: "#renderer-table-header-cell",
	props: {
		target: {
			type: Object
		},
		page: {
			type: Object
		}
	},
	computed: {
		colspan: function() {
			return this.target && this.target.table ? this.target.table.colspan : null;
		}
	}
});

