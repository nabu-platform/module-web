Vue.component("page-form-input-enumeration-array-configure", {
	template: "<n-form-section class='enumeration'>"
			+ " 	<n-form-switch v-model='field.disableTyping' label='Disable typing'/>"
			+ " 	<n-form-switch v-model='field.showRadioView' v-if='!field.showCheckboxView' label='Show radio visualisation'/>"
			+ " 	<n-form-switch v-model='field.showCheckboxView' v-if='!field.showRadioView && supportsMultiple' label='Show checkbox visualisation (allows multiselect)'/>"
			+ " 	<n-form-switch v-model='field.addEmptyState' label='Add empty state'/>"
			+ "		<n-form-text v-model='field.emptyValue' label='Empty text'/>"
			+ " 	<n-form-text v-if='!!field.addEmptyState' v-model='field.emptyState' label='Empty state text'/>"
			+ "		<n-form-text v-if='field.showRadioView' v-model='field.mustChoose' label='Must choose' placeholder='=true' allow-typing='true' />"
			+ "		<n-form-combo v-model='field.enumerationArray'"
			+ "			label='Enumeration Array'"
			+ "			:filter='getEnumerationArrays'/>"
			+ " 	<n-form-ace v-if='field.enumerationArray' label='Filter' v-model='field.filter'/>"
			+ "		<n-form-switch v-model='field.enumerationArrayLabelComplex' label='Complex Enumeration Label'/>"
			+ "		<n-form-combo v-if='field.enumerationArray && !field.enumerationArrayLabelComplex' v-model='field.enumerationArrayLabel' label='Enumeration Label'"
			+ "			:filter='function() { return getEnumerationFields(field.enumerationArray) }'/>"
			+ "		<n-form-switch v-model='field.enumerationArrayPrettyLabelComplex' label='Complex Pretty Enumeration Label'/>"
			+ "		<n-form-combo v-if='field.enumerationArray && !field.enumerationArrayPrettyLabelComplex' v-model='field.enumerationArrayPrettyLabel' label='Pretty enumeration Label'"
			+ "			:filter='function() { return getEnumerationFields(field.enumerationArray) }'/>"
			+ "		<n-form-text v-model='field.complexPrettyLabel' label='The complex pretty label' v-if='field.enumerationArrayPrettyLabelComplex'/>"
			+ "		<n-form-combo v-if='field.enumerationArray' v-model='field.enumerationArrayValue' label='Enumeration Value'"
			+ "			:filter='function() { return getEnumerationFields(field.enumerationArray) }' info='If nothing is selected, the entire document becomes the value'/>"
			+ "		<n-form-text v-model='field.complexLabel' label='The complex text label' v-if='field.enumerationArrayLabelComplex'/>"
			+ "		<typography-variable-replacer v-if='field.enumerationArrayLabelComplex && field.complexLabel' :content='field.complexLabel' :page='page' :container='field' :keys='getEnumerationFields(field.enumerationArray)' />"
			+ "		<typography-variable-replacer v-if='field.enumerationArrayPrettyLabelComplex && field.complexPrettyLabel' :content='field.complexPrettyLabel' :page='page' :container='field' :keys='getEnumerationFields(field.enumerationArray)' />"
			+ "		<n-form-combo v-if='field.enumerationArray' :filter='function() { return getEnumerationFields(field.enumerationArray) }' v-model='field.enumerationCachingKey' label='Enumeration Caching Key'/>"    
			+ "		<n-page-mapper v-model='field.bindings' :from='availableParameters' :to='[\"validator\"]'/>"
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
		}
	},
	created: function() {
		this.normalize(this.field);
	},
	computed: {
		availableParameters: function() {
			return this.$services.page.getAvailableParameters(this.page, this.cell, true);
		},
		supportsMultiple: function() {
			if (this.cell.state.name) {
				// this currently only works for page-based form fields
				// in v2, all form fields "should" be page based though?
				// only exception so far is inline form components in a data table
				var result = this.$services.page.getPageParameters(this.page);
				//var result = this.$services.page.getAvailableParameters(this.page, this.cell, true);
				var name = this.cell.state.name;
				if (name.indexOf("page.") == 0) {
					name = name.substring("page.".length);
				}
				var childDefinition = this.$services.page.getChildDefinition(result, name);
				return childDefinition ? childDefinition.type == "array" : false;
			}
			return false;
		}
	},
	methods: {
		normalize: function(field) {
			if (!field.bindings) {
				Vue.set(field, "bindings", {});
			}
		},
		enumerationFilter: function(value) {
			var providers = nabu.page.providers("page-enumerate").map(function(x) { return x.name });
			if (value) {
				providers = providers.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			providers.sort();
			return providers;
		},
		getEnumerationArrays: function(name) {
			var self = this;
			return this.$services.page.getAllArrays(this.page, this.cell.id).filter(function(x) {
				return !name || x.toLowerCase().indexOf(name.toLowerCase()) >= 0;
			});
		},
		getEnumerationFields: function(array) {
			var properties = {};
			var available = null;
			var variable = null;
			var rest = null;
			if (this.field.enumerationArray.indexOf("parent.") == 0) {
				var self = this;
				variable = this.field.enumerationArray.substring("parent.".length);
				var parentPage = this.$services.page.pages.filter(function(x) {
					return x.content.name == self.page.content.pageParent;
				})[0];
				if (parentPage != null) {
					//result.parent = this.getPageParameters(parentPage);
					available = this.$services.page.getAllAvailableParameters(parentPage);
				}
				rest = variable.substring(variable.indexOf(".") + 1);
				variable = variable.substring(0, variable.indexOf("."));
			}
			else {
				available = this.$services.page.getAllAvailableParameters(this.page, this.cell);
				variable = this.field.enumerationArray.substring(0, this.field.enumerationArray.indexOf("."));
				rest = this.field.enumerationArray.substring(this.field.enumerationArray.indexOf(".") + 1);
			}
			if (available[variable]) {
				var childDefinition = this.$services.page.getChildDefinition(available[variable], rest);
				if (childDefinition) {
					nabu.utils.objects.merge(properties, childDefinition.items.properties);
				}
			}
			return this.$services.page.getSimpleKeysFor({properties:properties});
		}
	}
});

// removed content from the n-form-radio as was defined for the neo project
// it does not appear to add anything of value, if something does not work, this should be checked first
// The code in question: ><template slot='label' scope='props'><label @click='props.select(props.value); $event.stopPropagation()' class='n-form-label' v-content='enumerationFormatter(props.value)'></label></template></n-form-radio
Vue.component("page-form-input-enumeration-array", {
	template: ""
			+ " <n-form-checkbox-list v-if='field.showCheckboxView' :items='enumerationFilterAny(null)' ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		v-bubble:input"
			+ "		:formatter='enumerationFormatter'"
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		v-bubble:label"
			+ "		:schema='schema'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:descriptionType='field.descriptionType'"
			+ "		:descriptionIcon='field.descriptionIcon'"
			+ "		:required='required'"
			+ "		:extracter='enumerationExtracter'"
			+ "		:disabled='disabled'/>"
			+ "<n-form-radio v-else-if='field.showRadioView'"
			+ "		:items='enumerationFilterAny(null)'"
			+ "		ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		v-bubble:input"
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
			+ "<n-form-combo ref='form' v-else"
			+ "		:filter='enumerationFilter'"
			+ "		:pretty-formatter='enumerationPrettyFormatter'"
			+ "		:formatter='enumerationFormatter'"
			+ " 	:extracter='enumerationExtracter'"
			+ "		:edit='!readOnly'"
			+ "		:required='required'"
			+ "		:placeholder='placeholder'"
			+ "		v-bubble:input"
			+ "		v-bubble:label"
			+ "		:timeout='600'"
			+ "		:empty-value='field.emptyValue'"
			+ "		:label='label ? $services.page.interpret(label, $self) : null'"
			+ "		:value='value'"
			+ "		:allow-typing='!field.disableTyping'"		
			+ "		:validator='getValidator()'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:schema='schema'"
			+ "		:disabled='disabled'/>",
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
		required: {
			type: Boolean,
			required: false
		},
		placeholder: {
			type: String,
			required: false
		}
	},
	data: function() {
		return {
			provider: null
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
		enumerationFilter: function(value) {
			var values = this.enumerationFilterAny(value);
			return values;
		},
		enumerationFilterAny: function(value) {
			if (this.field.enumerationArray) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				var pageArray = pageInstance.get(this.field.enumerationArray);
				var array = [];
				if (pageArray && pageArray.length) {
					nabu.utils.arrays.merge(array, pageArray);
				}
				if (this.field.filter) {
					array = array.filter(function(x) {
						return self.$services.page.isCondition(self.field.filter, x, self);
					})
				}
					
				if (array && array.length) {
					
					if (this.field.addEmptyState == true && this.field.emptyState != null) {
						// create empty object
						var empty = {}
						if (this.field.enumerationArrayValue) {
							empty[this.field.enumerationArrayValue] = null;
							empty['emptyState'] = true;
						}
						
						var emptyInArray = array.filter(function(x) {
							return x.emptyState == true;	
						});
						if (emptyInArray != null && emptyInArray.length == 0) {
							array.push(empty);
						}
					}
					
					if (!value) {
						return array;
					}
					else {
						return array.filter(function(x) {
							if (self.field.enumerationArrayLabel != null) {
								var label = x[self.field.enumerationArrayLabel];
								if (label && label.toLowerCase && label.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
									return true;
								}
							}
							if (self.field.enumerationArrayValue != null) {
								var label = x[self.field.enumerationArrayValue];
								if (label && label.toLowerCase && label.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
									return true;
								}
							}
						});
					}
				}
			}
			return [];
		},
		enumerationPrettyFormatter: function(value) {
			if (value == null) {
				return null;
			}
			if (value && value.emptyState == true && this.field.addEmptyState == true && !!this.field.emptyState) {
				return this.$services.page.interpret(this.$services.page.translate(this.field.emptyState), this);
			}
			else if (this.field.enumerationArrayPrettyLabelComplex) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return !this.field.complexPrettyLabel ? this.field.complexPrettyLabel : this.$services.typography.replaceVariables(pageInstance, this.field, this.field.complexPrettyLabel, this.$services.q.reject(), value);
			}
			else if (this.field.enumerationArrayPrettyLabel) {
				return value[this.field.enumerationArrayPrettyLabel];
			}
			else {
				return this.enumerationFormatter(value);
			}
		},
		enumerationFormatter: function(value) {
			if (value == null) {
				return null;
			}
			if (value && value.emptyState == true && this.field.addEmptyState == true && !!this.field.emptyState) {
				return this.$services.page.interpret(this.$services.page.translate(this.field.emptyState), this);
			}
			else if (this.field.enumerationArrayLabelComplex) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return !this.field.complexLabel ? this.field.complexLabel : this.$services.typography.replaceVariables(pageInstance, this.field, this.field.complexLabel, this.$services.q.reject(), value);
			}
			// we want complex labels
			else if (this.field.enumerationArrayLabelComplex) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				var storageId = "enumerate." + this.field.enumerationOperation + "." + value[this.field.enumerationOperationValue];
				if (this.field.enumerationCachingKey) {
					storageId += "." + value[this.field.enumerationCachingKey];
				}
				storageId = storageId.replace(/\./g, "_");
				
				if (pageInstance.retrieve(storageId) != null) {
					var retrieved = pageInstance.retrieve(storageId);
					return retrieved;
				}
				var self = this;
				pageInstance.store(storageId, "");
				
				setTimeout(function() {
					var parameters = nabu.utils.objects.deepClone({
						page: self.page,
						cell: {state: self.field},
						edit: false,
						data: value,
						label: false,
						fieldsName: "enumerationFields"
					});
					var onUpdate = function() {
						
						var content = null;
						if (self.field.enumerationArrayLabelComplex) {
							content = component.$el.innerHTML;
						}
						else {
							content = component.$el.innerHTML.replace(/<[^>]+>/g, "");
						}
						if (pageInstance.retrieve(storageId) != content) {
							pageInstance.store(storageId, content);
						}
					};
					var component = new nabu.page.views.PageFields({ propsData: parameters, updated: onUpdate, ready: onUpdate });
					component.$mount();
				}, 1);
				return pageInstance.retrieve(storageId);
			}
			else if (this.field.enumerationFormatter) {
				return this.field.enumerationFormatter(value);
			}
			else if (this.field.enumerationArrayLabel) {
				return value[this.field.enumerationArrayLabel];
			}
			else {
				return value;
			}
		},
		enumerationExtracter: function(value) {
			if (value == null) {
				return null;
			}
			else if (this.field.enumerationArrayValue) {
				return value[this.field.enumerationArrayValue];
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

		
		
		