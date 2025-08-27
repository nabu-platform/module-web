Vue.component("data-pipeline-mixin", {
	props: {
		page: {
			type: Object,
			required: true
		},
		parameters: {
			type: Object,
			required: false
		},
		childComponents: {
			type: Object,
			required: false
		},
		cell: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	created: function() {
		this.watchArray();
		if (this.loadData) {
			this.loadData();
		}
	},
	methods: {
		watchArray: function() {
			if (this.cell.state.array) {
				var self = this;
				this.$services.data.watchArray({
					instance: this,
					handler: function() {
						self.loadData();
					}
				});
			}
		}
	}
})

Vue.component("data-configure", {
	template: "#data-configure",
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
		}
	},
	created: function() {
		if (!this.target.bindings) {
			Vue.set(this.target, "bindings", {});
		}
		if (!this.target.defaultOrderBy) {
			Vue.set(this.target, "defaultOrderBy", []);
		}
		if (!this.target.type) {
			if (this.target.operation) {
				Vue.set(this.target, "type", "operation");
			}
			else if (this.target.array) {
				Vue.set(this.target, "type", "array");
			}
		}
	},
	computed: {
		operationParameters: function() {
			var result = [];
			if (this.target.operation) {
				// could be an invalid operation?
				if (this.$services.swagger.operations[this.target.operation]) {
					var parameters = this.$services.swagger.operations[this.target.operation].parameters;
					if (parameters) {
						nabu.utils.arrays.merge(result, parameters.map(function(x) { return x.name }));
					}
					result.push("$serviceContext");
				}
			}
			return result;
		}
	},
	methods: {
		getRepeatTypes: function(value) {
			var types = [];
			types.push({
				name: "operation",
				title: "The return value of a REST call"
			});
			types.push({
				name: "array",
				title: "The values available in an array"
			});
			nabu.utils.arrays.merge(types, nabu.page.providers("page-repeat"));
			if (value) {
				types = types.filter(function(x) {
					return (x.name && x.name.toLowerCase().indexOf(value.toLowerCase()) >= 0)
						|| (x.title && x.title.toLowerCase().indexOf(value.toLowerCase()) >= 0)
				})
			}
			return types;
		},
		getRepeatConfigurator: function() {
			var self = this;
			if (this.target.type && this.target.type != "operation" && this.target.type != "array") {
				var type = nabu.page.providers("page-repeat").filter(function(x) {
					return x.name == self.target.type;
				})[0];
				return type ? type.configurator : null;
			}	
		},
		getOrderByFields: function() {
			var result = [];
			if (this.target && this.target.operation) {
				var operation = this.$services.swagger.operation(this.target.operation);	
				var self = this;
				if (operation && operation.parameters) {
					var orderBy = operation.parameters.filter(function(x) {
						return x.name == "orderBy";
					})[0];
					// if we have an order by field, we can order by all the outputs (by default)
					if (orderBy && operation.responses["200"] && operation.responses["200"].schema) {
						var definition = self.$services.swagger.resolve(operation.responses["200"].schema);
						var arrays = self.$services.page.getArrays(definition);
						if (arrays.length > 0) {
							var childDefinition = self.$services.page.getChildDefinition(definition, arrays[0]);
							if (childDefinition && childDefinition.items && childDefinition.items.properties) {
								nabu.utils.arrays.merge(result, Object.keys(childDefinition.items.properties));
							}
						}
					}
				}
			}
			return result;
		}
	}
});

Vue.component("data-pipeline-configure", {
	template: "#data-pipeline-configure",
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
		removable: {
			type: Boolean,
			default: true
		},
		pipeline: {
			type: Object,
			required: true
		}
	},
	data: function() {
		return {
			
		}
	}
});

Vue.component("data-pipelines-configure", {
	template: "#data-pipelines-configure",
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
		allowed: {
			type: Number
		},
		initializer: {
			type: Function
		}
	},
	created: function() {
		if (!this.target.pipelines) {
			Vue.set(this.target, "pipelines", []);
		}
		if (this.allowed == 1 && this.target.pipelines.length == 0) {
			this.addPipeline();
		}
	},
	data: function() {
		return {
			
		}
	},
	methods: {
		addPipeline: function() {
			var pipeline = {};
			if (this.initializer) {
				this.initializer(pipeline);
			}
			this.target.pipelines.push(pipeline);
		}
	}
});