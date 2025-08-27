if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

nabu.page.views.Pages = Vue.extend({
	template: "#nabu-pages",
	data: function() {
		return {
			parameters: {},
			showing: false,
			pageToRoute: null,
			// the currently open category
			opened: null,
			lastColor: {},
			selectedTab: 'settings',
			showTemplates: false,
			selectedTemplates: []
		}
	},
	computed: {
		categories: function() {
			var categories = [];
			var hasEmpty = false;
			this.$services.page.pages.map(function(x) {
				if (!x.content.category) {
					hasEmpty = true;
				}
				else if (categories.indexOf(x.content.category ? x.content.category : null) < 0) {
					categories.push(x.content.category ? x.content.category : null);
				}
			});
			categories.sort();
			if (hasEmpty) {
				categories.unshift(null);
			}
			return categories;
		},
		hasTemplates: function() {
			return this.$services.page.pageTemplates.length > 0;
		},
		templateCategories: function() {
			var groups = [];
			this.$services.page.pageTemplates.forEach(function(x) {
				if (x.category && groups.indexOf(x.category) < 0) {
					groups.push(x.category);
				}
				else if (x.category == null && groups.indexOf("Miscellaneous") < 0) {
					groups.push("Miscellaneous");
				}
			});
			groups.sort(function(a, b) {
				return a.toLowerCase().localeCompare(b.toLowerCase());
			});
			return groups;
		}
	},
	created: function() {
		if (this.$services.page.pages.length > 0) {
			this.selectedTab = "pages";
		}	
	},
	ready: function() {
		document.body.removeAttribute("page");
		document.body.removeAttribute("category");
		// this can make it harder to style the index itself, but otherwise the pages page keeps refreshing while you are styling
		// which can be awefully annoying as it is autosave
		this.$services.page.disableReload = true;
		if (this.$services.page.canEdit()) {
			var self = this;
			this.$el.addEventListener("paste", function(event) {
				var data = event.clipboardData.getData("text/plain");
				if (data) {
					var parsed = JSON.parse(data);
					if (parsed && parsed.type == "page-category") {
						self.$confirm({ 
							message: "Are you sure you want to add the category '" + parsed.category + "' to this website?", 
							type: 'question', 
							ok: 'Add'
						}).then(function() {
							parsed.pages.map(function(page) {
								self.$services.page.update(page);
							})
						});
					}
					// check for some markers that it is a page
					else if (parsed && parsed.category && parsed.name && parsed.rows && parsed.counter != null) {
						self.$prompt(function() {
							return new nabu.page.views.PagesPaste({data: {
								category: parsed.category,
								name: parsed.name
							}});
						}).then(function(result) {
							parsed.name = result.name;
							parsed.label = self.$services.page.prettify(result.name);
							parsed.category = result.category;
							var page = {
								content: parsed,
								name: parsed.name
							}
							self.$services.page.update(page);
						});
						/*
						self.$confirm({ 
							message: "Are you sure you want to add the page '" + parsed.path + "' from category '" + parsed.category + "' to this website?", 
							type: 'question', 
							ok: 'Add'
						}).then(function() {
							var page = {
								content: parsed,
								name: parsed.name ? parsed.name : prompt("Name of the page?")
							}
							if (page.name) {
								self.$services.page.update(page);
							}
						});
						*/
					}
				}
			});
		}
		else {
			this.$services.router.route("login", null, null, true);
		}
	},
	beforeDestroy: function() {
		this.$services.page.disableReload = false;	
	},
	methods: {
		getAdditionalSettings: function() {
			// each entry should have:
			// - icon
			// - name: a technical name
			// - title: pretty name for the user (can be translated)
			// - route
			return nabu.page.providers("page-settings");
		},
		dropOnPages: function(event) {
			if (this.$services.page.getDragData(event, "template-content")) {
				var content = JSON.parse(this.$services.page.getDragData(event, "template-content"));
				console.log("dropped", content);
				// row drop from templates
				if (content.type == "page") {
					console.log("dropped", content);
					this.$services.page.update({
						name: content.content.name,
						content: content.content
					});
				}
				else if (content.type == "pages") {
					var self = this;
					// we assume the content is an array of pages in this case
					content.content.forEach(function(content) {
						self.$services.page.update({
							name: content.name,
							content: content
						});
					});
				}
			}
		},
		dragOverPages: function(event) {
			if (this.$services.page.getDragData(event, "template-content")) {
				var content = JSON.parse(this.$services.page.getDragData(event, "template-content"));
				// row drop from templates
				if (content.type == "page" || content.type == "pages") {
					event.preventDefault();
				}
			}
		},
		toggleSelectionFor: function(template) {
			var index = this.selectedTemplates.indexOf(template);
			if (index >= 0) {
				this.selectedTemplates.splice(index, 1);
			}
			else {
				this.selectedTemplates.push(template);
			}
		},
		dragTemplate: function(event, template) {
			// the content is already stringified at this point
			this.$services.page.setDragData(event, "template-content", template.content);
		},
		getTemplateCategory: function(category) {
			return this.$services.page.pageTemplates.filter(function(x) {
				return x.category == category || (category == "Miscellaneous" && x.category == null);
			});
		},
		getDevice: function(name) {
			var device = this.$services.page.devices.filter(function(x) { return x.name == name })[0];
			if (device == null) {
				device = {
					name: name,
					width: null
				};
				this.$services.page.devices.push(device);
			}
			return device;
		},
		addFunctionParameter: function(transformer, type) {
			transformer[type].push({});
		},
		updatePageName: function(page, newValue) {
			if (newValue) {
				console.log("page name is", page.name, newValue);
				// check that the name is not in use
				this.$services.page.rename(page, newValue);
			}
		},
		customNameValidator: function(newValue) {
			var messages = [];
			if (this.$services.page.pages.filter(function(x) { return x.content.name == newValue }).length > 0) {
				messages.push({
					severity: "error",
					title: "Name already in use",
					soft: false
				});
			}
			if (!newValue.match(/^[a-zA-Z0-9-/]+$/)) {
				messages.push({
					severity: "error",
					title: "Can only use lower case letters, numbers and dashes in the page name",
					soft: false
				});
			}
			console.log("validating custom", newValue, messages);
			return messages;
		},
		copy: function(page) {
			console.log("page is", page);
			nabu.utils.objects.copy(page.content);
		},
		copyCategory: function(category) {
			nabu.utils.objects.copy({
				type: "page-category",
				category: category,
				pages: this.getPagesFor(category)
			});
		},
		getPagesFor: function(category) {
			return this.$services.page.pages.filter(function(x) {
				return (!category && !x.content.category) || x.content.category == category;
			}).sort(function(a, b) {
				var sA = !!a.content.defaultAnchor;
				var sB = !!b.content.defaultAnchor;
				var cA = !a.content.path;
				var cB = !b.content.path;
				// first skeletons, then pages, then components
				if (sA && !sB) {
					return -1;
				}
				else if (!sA && sB) {
					return 1;
				}
				else if (cA && !cB) {
					return 1;
				}
				else if (!cA && cB) {
					return -1;
				}
				return 0;
			});
		},
		getPageTypeBadge: function(page) {
			// a skeleton
			if (page.content.defaultAnchor) {
				return "<span class='is-badge is-variant-neutral-outline is-border-full'>Skeleton</span>";
			}
			// a component
			else if (!page.content.path) {
				return "<span class='is-badge is-variant-secondary-outline is-border-full'>Component</span>";
			}	
			else {
				return "<span class='is-badge is-variant-primary-outline is-border-full'>Page</span>";
			}
		},
		insertColor: function(style, color) {
			this.$refs['editors_' + style.name][0].insert(color);
		},
		remove: function(page) {
			var self = this;
			this.$confirm({
				title: "Delete page",
				message: "Are you sure you want to delete the page '" + page.name + "'?"
			}).then(function() {
				self.$services.page.remove(page);
			});
		},
		create: function(category) {
			var self = this;
			this.$prompt(function() {
				return new nabu.page.views.PageCreate({
					propsData: {
						validator: self.customNameValidator,
						categories: self.categories,
						fixedCategory: category
					}
				});
			}).then(function(resolved) {
				self.$services.page.create(resolved.name, resolved.category);
			});
		},
		save: function(page) {
			this.$services.page.update(page);
			this.$services.page.loadPages([page]);
		},
		route: function(page) {
			this.pageToRoute = page;
			var parentParameters = null;
			if (page.content.pageParent) {
				var parentPage = this.$services.page.pages.filter(function(x) {
					return x.content.name == page.content.pageParent;
				})[0];
				if (parentPage) {
					parentParameters = this.$services.page.getPageParameters(parentPage, true, true);
				}
			}
			var parameters = this.$services.page.getPageParameters(page, true, true);
			if (Object.keys(parameters.properties).length || (parentParameters && Object.keys(parentParameters.properties).length)) {
				var result = {};
				if (parentParameters) {
					Object.keys(parentParameters.properties).map(function(key) {
						result[key] = null;	
					});
				}
				Object.keys(parameters.properties).map(function(key) {
					result[key] = null;
				})
				Vue.set(this, "parameters", result);
				this.showing = true;
			}
			else {
				this.doRoute();
			}
		},
		doRoute: function() {
			this.$services.router.route(this.$services.page.alias(this.pageToRoute), this.parameters);
		}
	}
});

nabu.page.views.PageCreate = Vue.extend({
	template: "#nabu-create-page",
	props: {
		fixedCategory: {
			type: String,
			required: false
		},
		validator: {
			type: Function,
			required: false
		},
		categories: {
			type: Array,
			required: false
		}
	},
	data: function() {
		return {
			category: null,
			name: null,
			newCategory: false
		}
	},
	computed: {
		hasAnyCategories: function() {
			return this.categories.length > 0;
		}	
	},
	created: function() {
		if (!this.hasAnyCategories) {
			this.newCategory = true;
		}	
	},
	methods: {
		checkCategory: function(value) {
			var categories = [];
			nabu.utils.arrays.merge(categories, this.categories.filter(function(x) { return !!x }));
			if (value) {
				categories = categories.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
				if (categories.indexOf(value) < 0) {
					categories.unshift(value);
				}
			}
			console.log("categories are", categories, value);
			return categories;
		}
	}
});

nabu.page.views.PagesPaste = Vue.extend({
	template: "#nabu-pages-paste",
	data: function() {
		return {
			category: null,
			name: null
		}
	}
});