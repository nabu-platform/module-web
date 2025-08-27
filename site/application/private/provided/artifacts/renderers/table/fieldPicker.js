Vue.component("data-field-picker", {
	template: "#data-field-picker",
	props: {
		value: {
			type: Array,
			required: true
		},
		fields: {
			type: Array,
			required: true
		}
	},
	data: function() {
		return {
			result: []
		}	
	},
	computed: {
		allChecked: function() {
			return this.result.filter(function(x) {
				return !x.checked
			}).length == 0;
		}
	},
	created: function() {
		nabu.utils.arrays.merge(this.result, this.fields.map(function(x) {
			return {
				name: x,
				checked: true
			}
		}));
		console.log("fields are", this.result);
	},
	methods: {
		checkAll: function() {
			this.result.forEach(function(x) {
				x.checked = true;
			});
		},
		uncheckAll: function() {
			this.result.forEach(function(x) {
				x.checked = false;
			});
		},
		upAll: function(field) {
			var index = this.result.indexOf(field);
			if (index > 0) {
				this.result.splice(index, 1);
				this.result.unshift(field);	
			}
		},
		up: function(field) {
			var index = this.result.indexOf(field);
			if (index > 0) {
				this.result.splice(index, 1);
				this.result.splice(index - 1, 0, field);
			}
		},
		down: function(field) {
			var index = this.result.indexOf(field);
			if (index < this.result.length - 1) {
				this.result.splice(index, 1);
				this.result.splice(index + 1, 0, field);
			}
		},
		downAll: function(field) {
			var index = this.result.indexOf(field);
			if (index < this.result.length - 1) {
				this.result.splice(index, 1);
				this.result.splice(this.result.length - 1, 0, field);
			}
		}
	},
	watch: {
		result: {
			deep: true,
			handler: function() {
				this.value.fields.splice(0);
				nabu.utils.arrays.merge(this.value.fields, this.result.filter(function(x) {
					return x.checked
				}).map(function (x){
					return x.name
				}));
			}
		}
	}
})