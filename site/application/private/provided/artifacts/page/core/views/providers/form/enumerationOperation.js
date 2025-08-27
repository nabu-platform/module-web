// allow complex formatting (e.g. multiple fields etc)
// can also allow complex extraction, though unlikely necessary

Vue.component("page-form-input-enumeration-operation-configure", {
	template: "<n-form-section class='enumeration'>"
			+ "		<n-form-combo v-model='field.enumerationOperation'"
			+ "			label='Enumeration Operation'"
			+ "			:filter='getEnumerationServices'/>"
			+ "		<n-page-mapper v-if='field.enumerationOperation && hasMappableEnumerationParameters(field)'"
			+ "			v-model='field.enumerationOperationBinding'"
			+ "			:from='availableParameters'"
			+ "			:to='getMappableEnumerationParameters(field)'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation' :filter='function() { return getEnumerationFields(field.enumerationOperation) }' v-model='field.enumerationCachingKey' label='Enumeration Caching Key'/>"    
			+ "		<n-form-switch v-model='field.enumerationOperationLabelComplex' label='Complex Enumeration Label'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation && !field.enumerationOperationLabelComplex' v-model='field.enumerationOperationLabel' label='Enumeration Label'"
			+ "			:filter='function() { return getEnumerationFields(field.enumerationOperation) }'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation' v-model='field.enumerationOperationValue' label='Enumeration Value'"
			+ "			:filter='function() { return getEnumerationFields(field.enumerationOperation) }' info='If nothing is selected, the entire document becomes the value'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation' v-model='field.enumerationOperationQuery' label='Enumeration Query'"
			+ "			:filter='function() { return getEnumerationParameters(field.enumerationOperation) }'/>"
			+ "		<n-form-combo v-if='field.enumerationOperation && field.enumerationOperationValue' :filter='function() { return getEnumerationParameters(field.enumerationOperation) }' v-model='field.enumerationOperationResolve' label='Resolve Field'/>"
			+ "		<n-form-text v-model='field.complexLabel' label='The complex text label' v-if='field.enumerationOperation && field.enumerationOperationLabelComplex'/>"
			+ "		<typography-variable-replacer v-if='field.enumerationOperation && field.enumerationOperationLabelComplex && field.complexLabel' :content='field.complexLabel' :page='page' :container='field' :keys='getEnumerationFields(field.enumerationOperation)' />"
			+ "		<n-form-text v-if=\"field.visualisation != 'radio'\" v-model='field.emptyValue' label='Empty Value Text'/>"
			+ "		<n-form-text v-if=\"field.visualisation != 'radio'\" v-model='field.calculatingValue' label='Calculating Value Text' info='The text to show while the result is being calculated'/>"
			+ "		<n-form-text v-if=\"field.visualisation != 'radio'\" v-model='field.resetValue' label='Reset Value Text' info='The text to show to reset the current value'/>"
			+ "		<n-form-text v-if=\"field.visualisation == 'combo'\" v-model='field.selectAllValue' label='Select all value' info='The text to show to select all values or deselectt all'/>"
			+ "		<n-form-switch v-if=\"field.visualisation == 'combo'\" v-model='field.useCheckbox' label='Add checkboxes'/>"
			+ "		<n-form-switch v-if=\"field.visualisation == 'combo'\" v-model='field.showTags' label='Show tags'/>"
			+ "		<n-form-text v-if=\"field.visualisation == 'combo'\" v-model='field.maxAmountOfTags' label='Max amount of tags visible' placeholder='3' after='Set to 0 to show all tags'/>"
			+ "		<n-form-switch v-if=\"field.visualisation == 'combo'\" v-model='field.showAmount' label='Show amount'/>"
			+ " 	<n-form-switch :invert='true' v-if=\"field.visualisation != 'radio'\" v-model='field.allowTyping' label='Disable typing' after='Can the user type to search?'/>"
			+ " 	<n-form-switch v-model='field.readOnly' label='Read only' after='Read only mode means the form element is replaced with a readable version'/>"
			+ " 	<n-form-switch v-if='field.showRadioView' v-model='field.showRadioView' label='Show radio visualisation'/>"
			+ " 	<n-form-switch v-model='field.selectFirstIfEmpty' label='Select the first value if none has been selected yet'/>"
			+ "		<n-form-text v-if='field.showRadioView' v-model='field.mustChoose' label='Must choose' allow-typing='true' />"
			+ "		<n-form-combo :items=\"['combo', 'combo-with-labels', 'radio']\" label='Visualisation' v-model='field.visualisation'/>"
			+ "		<n-form-text v-model='field.info' label='Info Content'/>"
			+ "		<n-form-text v-model='field.before' label='Before Content'/>"
			+ "		<n-form-text v-model='field.beforeIcon' label='Before Icon' v-if='field.before'/>"
			+ "		<n-form-text v-model='field.after' label='After Content'/>"
			+ "		<n-form-text v-model='field.afterIcon' label='After Icon' v-if='field.after'/>"
			+ "		<n-form-text v-model='field.suffix' label='Suffix' v-if='!field.suffixIcon'/>"
			+ "		<n-form-text v-model='field.suffixIcon' label='Suffix Icon' v-if='!field.suffix'/>"
			+ "		<n-page-mapper v-model='field.bindings' :from='availableParameters' v-if='false' :to='[\"validator\"]'/>"
			+ "</n-form-section>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		// the fragment this image is in
		field: {
			type: Object,
			required: true
		},
		possibleFields: {
			type: Array,
			required: false,
			default: function() { return [] }
		}
	},
	created: function() {
		if (!this.field.enumerationProvider) {
			Vue.set(this.field, "enumerationProvider", null);
		}
		if (this.field.showRadioView) {
			this.field.visualisation = "radio";
			delete this.field.showRadioView;
		}
		// backwards compatibility
		else if (!this.field.hasOwnProperty("visualisation")) {
			this.field.visualisation = "combo-with-labels";	
		}
		this.normalize(this.field);
	},
	computed: {
		availableParameters: function() {
			var result = this.$services.page.getAvailableParameters(this.page, this.cell, true);
			if (this.possibleFields.length > 0) {
				result["record"] = {properties:{}};
				this.possibleFields.forEach(function(x) {
					result.record.properties[x] = {type:"string"};	
				});
			}
			return result;
		}
	},
	methods: {
		searchPossible: function(value) {
			return this.possibleFields.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		},
		enumerationFilter: function(value) {
			var providers = nabu.page.providers("page-enumerate").map(function(x) { return x.name });
			if (value) {
				providers = providers.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			providers.sort();
			return providers;
		},
		normalize: function(field) {
			if (!field.enumerationOperation) {
				Vue.set(field, "enumerationOperation", null);
			}
			if (!field.enumerationOperationLabel) {
				Vue.set(field, "enumerationOperationLabel", null);
			}
			if (!field.enumerationOperationValue) {
				Vue.set(field, "enumerationOperationValue", null);
			}
			if (!field.enumerationOperationQuery) {
				Vue.set(field, "enumerationOperationQuery", null);
			}
			if (!field.enumerationOperationBinding) {
				Vue.set(field, "enumerationOperationBinding", {});
			}
		},
		// copy/pasted from the table getOperations
		getEnumerationServices: function(name) {
			var self = this;
			return this.$services.page.getOperations(function(operation) {
				// must be a get
				var isAllowed = operation.method.toLowerCase() == "get"
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0)
					// must have _a_ response
					&& operation.responses["200"];
				// we also need at least _a_ complex array in the results
				if (isAllowed) {
					var schema = operation.responses["200"] ? operation.responses["200"].schema : null;
					if (schema) {
						var definition = self.$services.swagger.definition(schema["$ref"]);
						// now we need a child in the definition that is a record array
						// TODO: we currently don't actually check for a complex array, just any array, could be an array of strings...
						isAllowed = false;
						if (definition.properties) {
							Object.keys(definition.properties).map(function(field) {
								if (definition.properties[field].type == "array") {
									isAllowed = true;
								}
							});
						}
					}
				}
				return isAllowed;
			}).map(function(x) {
				 return x.id;
			});	
		},
		getEnumerationFields: function(operationId) {
			var fields = [];
			if (this.$services.swagger.operations[operationId]) {
				var resolved = this.$services.swagger.resolve(this.$services.swagger.operations[operationId].responses["200"]);
				Object.keys(resolved.schema.properties).map(function(property) {
					if (resolved.schema.properties[property].type == "array") {
						nabu.utils.arrays.merge(fields, Object.keys(resolved.schema.properties[property].items.properties));
					}
				});
			}
			return fields;
		},
		getEnumerationParameters: function(operationId) {
			var parameters = this.$services.swagger.operations[operationId].parameters;
			return parameters ? parameters.map(function(x) { return x.name }) : [];
		},
		getMappableEnumerationParameters: function(field) {
			var result = {
				properties: {}
			};
			if (this.$services.swagger.operations[field.enumerationOperation]) {
				Object.keys(this.$services.page.getInputBindings(this.$services.swagger.operations[field.enumerationOperation])).map(function(key) {
					if (key != field.enumerationOperationQuery) {
						result.properties[key] = {
							type: "string"
						}
					}
				});
				result.properties["$serviceContext"] = {
					type: "string"
				}
			}
			return result;
		},
		hasMappableEnumerationParameters: function(field) {
			var amount = Object.keys(this.getMappableEnumerationParameters(field).properties).length;
			return amount > 0;
		}
	}
});

Vue.component("page-form-input-enumeration-operation", {
	template: ""
			+ "<n-form-radio v-if=\"field.showRadioView || field.visualisation == 'radio'\""
			+ "		:items='resolvedItems'"
			+ "		ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label ? $services.page.interpret(label, $self) : null'"
			+ "		:value='value'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:schema='schema'"
			+ "		v-bubble:label"
			+ "		:required='required'"
			+ "		:must-choose='field.mustChoose ? $services.page.interpret(field.mustChoose, $self) : null'"
			+ "		:formatter='enumerationFormatter'"
			+ "		:extracter='enumerationExtracter'"
			+ "		:disabled='disabled'/>"
			+ "<n-form-combo v-else ref='form' :filter='enumerationFilter' :formatter='enumerationFormatter' :extracter='enumerationExtracter' :resolver='enumerationResolver'"
			+ "		:combo-type=\"field.visualisation == 'combo' ? 'n-input-combo2' : 'n-input-combo'\""
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		@input=\"function(newValue, label, rawValue, selectedLabel) { $emit('input', newValue, label, rawValue, selectedLabel) }\""
			+ "		v-bubble:label"
			+ "		:timeout='600'"
			+ "		v-bubble:blur"
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:required='required'"
			+ "		:allow-typing='field.allowTyping'"
			+ "		:empty-value='field.emptyValue ? $services.page.translate($services.page.interpret(field.emptyValue)) : null'"
			+ "		:calculating-value='field.calculatingValue ? $services.page.translate($services.page.interpret(field.calculatingValue)) : null'"
			+ "		:reset-value='field.resetValue ? $services.page.translate($services.page.interpret(field.resetValue)) : null'"
			+ "		:info='field.info ? $services.page.translate(field.info) : null'"
			+ "		:before='field.before ? $services.page.translate(field.before) : null'"
			+ "		:after='field.after ? $services.page.translate(field.after) : null'"
			+ "		:suffix='field.suffixIcon ? $services.page.getIconHtml(field.suffixIcon) : field.suffix'"
			+ "		:validator='getValidator()'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:schema='schema'"
			+ "		:disabled='disabled'"
			+ "		:select-all-value='field.selectAllValue ? $services.page.translate($services.page.interpret(field.selectAllValue)) : null'"
			+ "		:use-checkbox='field.useCheckbox'"
			+ "		:show-tags='field.showTags'"
			+ "		:show-amount='field.showAmount'"
			+ "		:max-amount-of-tags='field.maxAmountOfTags'"
			+ "		/>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		},
		value: {
			required: true
		},
		label: {
			type: String,
			required: false
		},
		timeout: {
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		schema: {
			type: Object,
			required: false
		},
		readOnly: {
			type: Boolean,
			required: false
		},
		placeholder: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		},
		parentValue: {
			type: Object,
			required: false
		}
	},
	data: function() {
		return {
			provider: null,
			resolvedItems: []
		}
	},
	created: function() {
		if (Object.keys(this.field).length == 0) {
			// if we have no configuration at all yet, set visualisation to "new" combo
			Vue.set(this.field, "visualisation", "combo");
		}
		if (this.field.showRadioView) {
			var self = this;
			this.enumerationFilterAny(null, false).then(function(x) {
				nabu.utils.arrays.merge(self.resolvedItems, x);
			});
		}
	},
	methods: {
		getChildComponents: function() {
			return [{
				title: "Form combo",
				name: "form-component",
				component: "form-combo"
			}];
		},
		// enumerationOperation: null,
		// enumerationFormatter
		// enumerationOperationLabel: null,
		// enumerationOperationValue: null,
		// enumerationOperationQuery: null,
		// enumerationOperationBinding: {}
		enumerationFilter: function(value) {
			return this.enumerationFilterAny(value, false);
		},
		// if we set the "asResolve", we are actually resolving the existing value, so for example if you have an ID already
		// and you want to resolve it to the full object so you can get the correct label to show, it will be called with the resolve id
		// the query is used to find _new_ values
		enumerationFilterAny: function(value, asResolve) {
			if (!this.field.enumerationOperation) {
				return [];
			}
			var parameters = {
				limit: 20
			};
			if (!asResolve && this.field.enumerationOperationQuery) {
				parameters[this.field.enumerationOperationQuery] = value;
			}
			else if (asResolve && this.field.enumerationOperationResolve) {
				parameters[this.field.enumerationOperationResolve] = value;
			}
			var self = this;
			// map any additional bindings
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			if (this.field.enumerationOperationBinding) {
				Object.keys(this.field.enumerationOperationBinding).map(function(key) {
					// if the binding is not set, we don't want to overwrite any parameters that are already there (e.g. the resolve field)
					if (self.field.enumerationOperationBinding[key] != null) {
						var target = parameters;
						var parts = key.split(".");
						for (var i = 0; i < parts.length - 1; i++) {
							if (!target[parts[i]]) {
								target[parts[i]] = {};
							}
							target = target[parts[i]];
						}
						if (self.field.enumerationOperationBinding[key].indexOf("record.") == 0) {
							target[parts[parts.length - 1]] = self.$services.page.getValue(self.parentValue, self.field.enumerationOperationBinding[key].substring("record.".length));
						}
						else {
							target[parts[parts.length - 1]] = self.$services.page.getBindingValue(pageInstance, self.field.enumerationOperationBinding[key], self);
						}
					}
				});
			}
			if (!parameters["$serviceContext"]) {
				parameters["$serviceContext"] = pageInstance.getServiceContext();
			}
			return this.$services.swagger.execute(this.field.enumerationOperation, parameters, function(response) {
				var result = null;
				if (response) {
					Object.keys(response).map(function(key) {
						if (response[key] instanceof Array) {
							result = response[key];
							if (self.field.selectFirstIfEmpty && self.value == null && result && result.length > 0) {
								self.$emit("input", self.enumerationExtracter(result[0]));
							}
						}
					});
				}
				return result ? result : [];
			});
		},
		enumerationResolver: function(value) {
			if (this.field.enumerationOperationResolve && this.field.enumerationOperationValue) {
				return this.enumerationFilterAny(value, true);
			}
			return value;
		},
		enumerationFormatter: function(value) {
			if (value == null) {
				return null;
			}
			else if (this.field.enumerationOperationLabelComplex) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return !this.field.complexLabel ? this.field.complexLabel : this.$services.typography.replaceVariables(pageInstance, this.field, this.field.complexLabel, this.$services.q.reject(), value);
			}
			else if (this.field.enumerationFormatter) {
				return this.field.enumerationFormatter(value);
			}
			else if (this.field.enumerationOperationLabel) {
				return value[this.field.enumerationOperationLabel];
			}
			else {
				return value;
			}
		},
		enumerationExtracter: function(value) {
			if (value == null) {
				return null;
			}
			else if (this.field.enumerationOperationValue) {
				return value[this.field.enumerationOperationValue];
			}
			else {
				return value;
			}
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		},
		getValidator: function() {
			if (this.field.bindings && this.field.bindings.validator) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.validator, this);
			}
		}
	}
});

