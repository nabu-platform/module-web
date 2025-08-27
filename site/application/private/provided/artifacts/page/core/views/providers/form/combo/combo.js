Vue.component("page-form-combo-configure", {
	template: "#page-form-combo-configure",
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


Vue.component("page-form-combo", {
	mixins: [Vue.component("enumeration-provider")],
	template: "#page-form-combo",
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
	// if we have an operation binding, let's retrigger the data lookup (for combo 2)
	watch: {
		operationBinding: {deep: true, handler: function(newValue) {
			// set to dirty
			// the first combo is the form-combo which in turn has its own ref
			if (this.$refs.combo && this.$refs.combo.$refs.combo) {
				this.$refs.combo.$refs.combo.markDirty();
			}
		}}
	},
	methods: {
		configurator: function() {
			return "page-form-combo-configure";
		},
		getChildComponents: function() {
			return {
				title: "Form Combo",
				name: "page-form-combo",
				component: "form-combo"
			};
		},
		validate: function(soft) {
			if (this.$refs.combo) {
				return this.$refs.combo.validate(soft);
			}
		}
	}
})


window.addEventListener("load", function() {
	application.bootstrap(function($services) {
		$services.router.register({
			alias: "page-form-combo",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-combo";
				cloneParameters.configurationComponent = "page-form-combo-configure";
				cloneParameters.subTabs = ["data"];
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "combo",
			category: "Form",
			name: "Combo box",
			description: "A combo box that allows the user to choose one or more values",
			icon: "page/core/images/enumeration.png"
		});
	})
});