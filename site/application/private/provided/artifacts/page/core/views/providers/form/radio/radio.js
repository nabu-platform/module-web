Vue.component("page-form-radio-configure", {
	template: "#page-form-radio-configure",
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
		}
	}
});


Vue.component("page-form-radio", {
	mixins: [Vue.component("enumeration-provider")],
	template: "#page-form-radio",
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
		},
		childComponents: {
			required: false
		}
	},
	// if we have an operation binding, let's retrigger the data lookup (for radio 2)
	watch: {
		operationBinding: {deep: true, handler: function(newValue) {
			// set to dirty
			// the first radio is the form-radio which in turn has its own ref
			if (this.$refs.radio && this.$refs.radio.$refs.radio) {
				this.$refs.radio.$refs.radio.markDirty();
			}
		}}
	},
	methods: {
		disabler: function(item) {
			if (this.field.disableEntryCondition) {
				return this.$services.page.isCondition(this.field.disableEntryCondition, item, this, null, false);
			}
			return false;
		},
		configurator: function() {
			return "page-form-radio-configure";
		},
		getChildComponents: function() {
			return {
				title: "Form radio",
				name: "page-form-radio",
				component: "form-radio-list"
			};
		},
		validate: function(soft) {
			if (this.$refs.radio) {
				return this.$refs.radio.validate(soft);
			}
		}
	}
})


window.addEventListener("load", function() {
	application.bootstrap(function($services) {
		$services.router.register({
			alias: "page-form-radio",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-radio";
				cloneParameters.configurationComponent = "page-form-radio-configure";
				cloneParameters.subTabs = ["data"];
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "radio",
			category: "Form",
			name: "Radio box",
			description: "A radio box that allows the user to choose one or more values",
			icon: "page/core/images/enumeration.png"
		});
	})
});