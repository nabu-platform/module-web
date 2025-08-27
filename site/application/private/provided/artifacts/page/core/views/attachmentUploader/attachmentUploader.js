/*
There are a number of challenges to attachment uploading:
- the visualization (especially when uploading multiple) is often very application dependent so should not be encapsulated in the component
- often file uploads are part of a larger form which means there is an overarching json that you are trying to build. attachments _can_ be base64 encoded in the json but this often balloons the size unnecessarily
- when using "update" forms, you definitely don't want to ship json base64 back and forth
- uploads tend to take a while, so you need some visual feedback for the user and you need to make sure the user does not click "submit" before it is done
- images tend to be oversized because of the high resolution of cameras, we generally need to resize this
- it is usually better (though not always) to immediately start uploading when the user selects a file rather than waiting for the full form to be submitted because of the upload duration
	- however, the user can still cancel the form at which point we have uploaded data that should not yet be associated
	- when hitting attachment limits we definitely do not want to start removing data before the form is finally submitted
- there is usually a limit to the amount of files you can upload
	- suppose you are in a create scenario (so nothing fully persisted yet) and you have a limit of 2 files and you add a third.
		- the frontend could either block the third or automatically remove the first. it has been staged in the backend but not yet linked to the owner
	- suppose you are in an update scenario though and 2 files are already linked in the backend
		- again the frontend could simply block the change until you manually delete a file or automatically delete one (which one though?)
		- either way, manual or automatic: the file should not ACTUALLY be deleted until the form is submitted!
	- the intent here is that the backend, upon receiving the full json of the form, automatically deletes any attachments no longer in the json
	- for singular fields it is "easier" because there can be only one
	- for arrays the frontend can't correctly deduce which attachments to delete so instead it will block until the user deletes manually


The attachment uploader works on a form field that contains a REFERENCE to the attachment, not the actual binary data. Because it does not need to visualize the data, it does not need to know the visualization method.
The reference can be either a simple type (e.g. uuid or uri) or (more likely) a structure containing multiple fields.
The uploader assumes that the return value of the services involved conforms to the data structure expected in the form.

This attachment uploader is meant to immediately upload attachments into a potential staging area.
The result of the operation that is called to store it will be set into the form field, this is usually a complex record.
The form field can be singular or a list but is assumed to be part of a larger JSON.
The content of the attachment will NOT be in the json, it will only contain metadata pertaining to the attachment.

There are two modi for this uploader:

- single operation to push data to
- two operations: the first to "quickly" create placeholders records that can be immediately added to the json (in batch!)
	-> the records are assumed to have a public uri field (mappable), in the frontend this uri will be prefilled with a base64 encoded version for instant display while uploading
	-> note that this assumes the uri IS part of the return of the batch placeholder creation service but NOT part of the final operation triggered by the form (otherwise we might submit the base64 data)
	
In the placeholder scenario, we can call a second service with an identifier of a particular placeholder to then upload the data to. The progress of this upload can be fed into a field of the record.
If the field does not exist, a temporary field is added "$progress". Additionally a "$state" field or "$url" field are created if not provided.

Note that images are resized as needed.
*/

Vue.component("n-form-attachment-uploader", {
	template: "#n-form-attachment-uploader",
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
		parentValue: {
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
		edit: {
			type: Boolean,
			required: false
		},
		name: {
			type: String,
			required: false
		},
		readOnly: {
			type: Boolean,
			required: false,
			default: false
		},
		contentField: {
			type: String,
			default: "content"
		},
		nameField: {
			type: String,
			default: "contentName"
		},
		typeField: {
			type: String,
			default: "contentType"
		},
		childComponents: {
			type: Object,
			required: false
		}
	},
	data: function() {
		return {
			files: [],
			working: [],
			messages: [],
			valid: null
		}
	},
	computed: {
		isArray: function() {
			if (this.field.name) {
				var arrays = this.$services.page.getAllArrays(this.page, this);
				if (arrays.indexOf(this.field.name) >= 0 || arrays.indexOf("page." + this.field.name) >= 0) {
					return true;
				}
			}
			return false;
		},
		maxFiles: function() {
			if (this.isArray) {
				var max = this.field.maxFiles;
				if (max) {
					return this.$services.page.interpret(max, this); 
				}
			}
			else {
				return 1;
			}
		},
		// how many files can be added before we can't
		remaining: function() {
			// for arrays, it depends on the max size of the array vs the current amount
			if (this.isArray) {
				if (this.maxFiles) {
					// when we use reservation, the value will reflect the size, we don't need to check the working
					return this.maxFiles - (this.value instanceof Array ? this.value.length : 0) - (this.field.reservationOperation ? 0 : this.working.length);
				}
				return Number.MAX_SAFE_INTEGER;
			}
			// for non-arrays we can always set 1
			else {
				return 1;
			}
		},
		allowedFileTypes: function() {
			if (this.field.fileTypes) {
				return this.field.fileTypes.filter(function(x) { 
					return !!x.contentType;
				}).map(function(x) {
					return x.contentType;
				});
			}
		}
	},
	methods: {
		validate: function(soft) {
			return [];
		},
		changed: function() {
			var self = this;
			this.messages.splice(0);
			this.valid = null;
			// too many files
			if (this.files.length > this.remaining) {
				this.messages.push({
					severity: "info",
					code: "too-many-files",
					title: "%{You can only add {maximum} images}", 
					values: {
						maximum: this.maxFiles
					}
				});
			}
			else {
				this.upload(this.files.splice(0));
			}
		},
		upload: function(files) {
			if (this.field.reservationOperation) {
				var self = this;
				this.reserve(files).then(function(result) {
					if (result) {
						if (self.field.reservationOutputArrayName) {
							result = self.$services.page.getValue(result, self.field.reservationOutputArrayName);
						}
						if (result instanceof Array) {
							for (var i = 0; i < result.length; i++) {
								if (i < files.length) {
									self.uploadSingle(files[i], result[i]);
								}
							}
						}
						// not an array, i hope were are only uploading a single file?
						else {
							self.uploadSingle(files[0], result);
						}
					}
				})
			}
			else {
				files.forEach(this.uploadSingle);
			}
		},
		reserve: function(files) {
			var parameters = {};
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			if (this.field.reservationBindings) {
				var self = this;
				files.forEach(function(file) {
					// we assume that it is a batch service
					var newRecord = {};
					Object.keys(self.field.reservationBindings).forEach(function(key) {
						var binding = self.field.reservationBindings[key];
						if (binding) {
							var value = null;
							if (binding == "$file.fileName") {
								value = file.name;
							}
							else if (binding == "$file.contentType") {
								value = file.type;
							}
							else if (binding.indexOf("$file") != 0) {
								value = self.$services.page.getBindingValue(pageInstance, binding, self);
							}
							if (value) {
								// meant for an array
								if (key.indexOf("$reserved") == 0) {
									newRecord[key.substring("$reserved.".length)] = value;
								}
								else {
									self.$services.page.setValue(parameters, key, value);
								}
							}
						}
					});
					if (self.field.reservationInputArrayName) {
						var current = self.$services.page.getValue(parameters, self.field.reservationInputArrayName);
						if (!current) {
							current = [];
							self.$services.page.setValue(parameters, self.field.reservationInputArrayName, current);
						}
						current.push(newRecord);
					}
				});
			}
			if (!parameters["$serviceContext"]) {
				parameters["$serviceContext"] = pageInstance.getServiceContext();
			}
			return this.$services.swagger.execute(this.field.reservationOperation, parameters);
		},
		// the record is optional for the two-phase approach
		uploadSingle: function(file, record) {
			if (record) {
				if (this.value instanceof Array) {
					this.value.push(record);
				}
				else {
					this.$emit("input", record);
				}
			}
			var promise = this.$services.q.defer();
			if (this.field.uploadOperation) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				// add it to the working array
				this.working.push(file);
				var self = this;
				var finalizeWorking = function() {
					self.working.splice(self.working.indexOf(file), 1);
				}
				self.$services.image.resize(file, self.field.maxWidth, self.field.maxHeight).then(function(resized) {
					var parameters = {};
					parameters.body = resized.file;
					if (self.field.uploadBindings) {
						Object.keys(self.field.uploadBindings).forEach(function(key) {
							var binding = self.field.uploadBindings[key];
							if (binding) {
								var value = null;
								if (binding == "$file.fileName") {
									value = file.name;
								}
								else if (binding == "$file.contentType") {
									value = file.type;
								}
								else if (binding.indexOf("$reserved") == 0) {
									if (record) {
										value = self.$services.page.getValue(record, binding.substring("$reserved.".length));
									}
								}
								else if (binding.indexOf("$file") != 0) {
									value = self.$services.page.getBindingValue(pageInstance, binding, self);
								}
								if (value) {
									self.$services.page.setValue(parameters, key, value);
								}
							}
						});
					}
					if (record && self.field.urlField) {
						Vue.set(record, self.field.urlField, resized.url);
					}
					if (!parameters["$serviceContext"]) {
						parameters["$serviceContext"] = pageInstance.getServiceContext();
					}
					self.$services.swagger.execute(self.field.uploadOperation, parameters).then(function(result) {
						if (record) {
							// merge any changes back into the record
							Object.keys(result).forEach(function(key) {
								// NOT the url field, this would just trigger rerenders and not change the content
								// IMPORTANT: we assume the url field does not make it to the backend when submitting the full json
								if (key != self.field.urlField) {
									Vue.set(record, key, result[key]);
								}
							})
						}
						else if (this.value instanceof Array) {
							self.value.push(result);
						}
						else {
							self.$emit("input", result);
						}
						finalizeWorking();
						promise.resolve();
					}, function() {
						finalizeWorking();
						promise.reject();
					});
				})
			}
			else {
				promise.reject();
			}
			return promise;
		},
		getChildComponents: function() {
			return [{
				title: "File Input",
				name: "file-input",
				component: "column"
			}, {
				title: "File Input Button",
				name: "file-input-button",
				component: "button"
			}]
		},
	}
});


Vue.component("n-form-attachment-uploader-configure", {
	template: "#n-form-attachment-uploader-configure",
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
		childComponents: {
			type: Object,
			required: false
		}
	},
	created: function() {
		if (!this.field.reservationBindings) {
			Vue.set(this.field, "reservationBindings", {});
		}
		if (!this.field.uploadBindings) {
			Vue.set(this.field, "uploadBindings", {});
		}
		if (!this.field.fileTypes) {
			Vue.set(this.field, "fileTypes", []);
		}
	},
	computed: {
		isArray: function() {
			if (this.field.name) {
				var arrays = this.$services.page.getAllArrays(this.page, this);
				if (arrays.indexOf(this.field.name) >= 0 || arrays.indexOf("page." + this.field.name) >= 0) {
					return true;
				}
			}
			return false;
		}
	},
	methods: {
		getOutputUrlFieldOptions: function(value) {
			var output = this.$services.page.getSwaggerOperationOutputDefinition(this.field.uploadOperation);
			if (output) {
				var arrayName = this.$services.page.getArrays(output)[0];
				if (arrayName) {
					arrayName.split(".").forEach(function(x) {
						output = output.properties[x];
					})
					output = output.items;
				}
				return this.$services.page.getSimpleKeysFor(output, false, false)
					.filter(function(x) {
						return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
					});
			}
			return [];
		},
		getReservationInputFields: function() {
			if (this.field.reservationOperation) {
				var input = this.$services.page.getSwaggerOperationInputDefinition(this.field.reservationOperation);
				// the reservation may be a batch input or a singular input (depending on setup)
				// if we detect an array, we assume it is a batch upload!
				if (input) {
					var arrayInput = this.$services.page.getArrays(input)[0];
					var keys = this.$services.page.getSimpleKeysFor(input, false, false);
					if (arrayInput != null) {
						arrayInput.split(".").forEach(function(x) {
							input = input.properties[x];
						})
						nabu.utils.arrays.merge(
							keys,
							this.$services.page.getSimpleKeysFor({properties:{$reserved:input.items}}, false, false)
						)
					}
					return keys;
				}
			}
			return {};
		},
		getAvailableReservationParameters: function() {
			var result = {};
			nabu.utils.objects.merge(result, this.$services.page.getAllAvailableParameters(this.page));
			result.$file = {
				properties: {
					fileName: {
						type: "string"
					},
					contentType: {
						type: "string"
					}
				}
			}
			return result;
		},
		getAvailableUploadParameters: function() {
			var result = this.getAvailableReservationParameters();
			if (this.field.reservationOperation) {
				var output = this.$services.page.getSwaggerOperationOutputDefinition(this.field.reservationOperation);
				if (output) {
					var arrayName = this.$services.page.getArrays(output)[0];
					if (arrayName) {
						arrayName.split(".").forEach(function(x) {
							output = output.properties[x];
						})
						result.$reserved = output.items;
					}
					else {
						result.$reserved = output;
					}
				}
			}
			return result;
		},
		getReservationOutputArrayName: function() {
			if (this.field.reservationOperation) {
				var output = this.$services.page.getSwaggerOperationOutputDefinition(this.field.reservationOperation);
				if (output) {
					return this.$services.page.getArrays(output)[0];
				}
			}
			return null;
		},
		getReservationInputArrayName: function() {
			if (this.field.reservationOperation) {
				var input = this.$services.page.getSwaggerOperationInputDefinition(this.field.reservationOperation);
				if (input) {
					return this.$services.page.getArrays(input)[0];
				}
			}
			return null;
		}
	},
	watch: {
		"field.reservationOperation": function() {
			// we need this to dynamically build the reservation call
			this.field.reservationInputArrayName = this.getReservationInputArrayName();
			this.field.reservationOutputArrayName = this.getReservationOutputArrayName();
		}
	}
});

window.addEventListener("load", function() {
	application.bootstrap(function($services) {
		nabu.page.provide("page-form-list-input", { 
			component: "n-form-attachment-uploader", 
			configure: "n-form-attachment-uploader-configure", 
			name: "attachment-uploader",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "n-form-attachment-uploader", 
			configure: "n-form-attachment-uploader-configure", 
			name: "attachment-uploader",
			namespace: "nabu.page"
		});
		$services.router.register({
			alias: "page-form-attachment-uploader",
			enter: function(parameters) {
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "n-form-attachment-uploader";
				cloneParameters.configurationComponent = "n-form-attachment-uploader-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "attachmentUploader",
			category: "Form",
			name: "Attachment uploader",
			description: "Uploads attachments and can resize images",
			icon: "page/core/images/image.svg"
		});
	});
});

