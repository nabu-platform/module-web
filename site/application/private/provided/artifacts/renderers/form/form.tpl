<template id="renderer-form">
	<n-form :class="getChildComponentClasses('form')" :content-class="getChildComponentClasses('form-container')" :mode="mode" @submit="submit" @update="update">
		<slot @update="update"></slot>
		<n-messages :messages="messages" slot="footer" v-if="messages.length"/>
	</n-form>
</template>

<template id="renderer-form-configure">
	<div class="renderer-form-configure is-column is-spacing-gap-medium">
		
		<n-form-switch v-model="target.form.readOnly" label="Read only"/>
		
		<n-form-combo 
			name="form-type"
			v-model="target.form.formType"
			:items="[{name: 'page', title: 'Page form'}, {name:'operation', title: 'Operation Form'}, {name: 'array', title: 'Array form'}, {name: 'function', title: 'Function form'}]"
			:formatter="function(x) { return x.title }"
			:extracter="function(x) { return x.name }"
			label="What type of form do you want?"/>
		
		
		<div v-if="target.form.formType == 'operation'">
			<n-form-combo label="Operation" v-model="target.form.operation" 
				:filter="getOperations"
				:formatter="function(x) { return x.id }"
				:extracter="function(x) { return x.id }"/>
		</div>
		
		<div class="is-column is-spacing-medium">
			<div class="is-row is-align-end">
				<button class="is-button is-variant-primary-outline is-size-xsmall" @click="target.form.fields.push({})"><icon name="plus"/><span class="is-text">Add state field</span></button>
			</div>
			<div v-for="field in target.form.fields" class="is-column is-color-body is-spacing-medium has-button-close">
				<n-form-text v-model="field.name" label="Field name"/>
				<n-form-combo v-model="field.type" label="Field type" :filter="getParameterTypes"/>
				<button class="is-button is-variant-close is-size-xsmall" @click="target.form.fields.splice(target.form.fields.indexOf(field), 1)"><icon name="times"/></button>
			</div>
		</div>
		
		<div v-if="target.form.formType == 'array'" class="is-column is-spacing-medium">
			<n-form-combo 
				label="Array" 
				v-model="target.form.array"
				:filter="function(value) { return $services.page.getAllArrays(page) }"
				/>
		</div>
		
		<div v-else-if="target.form.formType == 'function'" class="is-column is-spacing-medium">
			<n-form-combo v-model="target.form.function" label="Function" :filter="$services.page.listFunctions" />
		</div>

		<div v-if="false && (target.form.formType == 'operation' || (target.form.formType == 'page' && target.form.submitType == 'staged'))">
			<n-form-text v-model="target.form.submitEvent" label="Submit event" after="Emitted once the form has been submitted, the response at that point may still be positive or negative"/>
			<n-form-text v-model="target.form.successEvent" label="Success event" after="Emitted once the form has been successfully submitted"/>
			<n-form-text v-model="target.form.errorEvent" label="Error event" after="Emitted if the form could not be submitted correctly"/>
		</div>
		
		<n-form-switch v-model="target.form.synchronize" label="Synchronize changes back to binding" v-if="target.form.formType != 'page'"/>
		<n-form-switch v-model="target.form.bindingByReference" label="Perform input parameter binding by reference"/>
		<n-form-switch v-model="target.form.submitOnChange" label="Submit on change"/>
		<n-form-switch v-model="target.form.enableParameterWatching" label="Watch bound values for change"/>

		<n-form-switch v-model="target.form.translatable" label="Translatable" after="Add a language switching capability to the form, mostly to manage translations of operational data" />
		
		<div v-if="target.form.formType">
			<n-form-switch v-model="target.form.noInlineErrors" label="Disable inline error message" after="By default, validation errors will be shown inline."/>
		</div>
		
		<div class="is-column is-spacing-medium">
			<h3 class="is-h3">Validation Messages</h3>
			<p class="is-p is-size-small">You can remap specific validation codes for the whole form to provide the user with a different message than the default message available for that code.</p>
			<div v-if='target.form.codes' class="is-column is-spacing-vertical-gap-medium">
				<div class="is-column is-color-body is-spacing-medium has-button-close" v-for='code in target.form.codes' :timeout='600'>
					<n-form-text v-model='code.code' label='Code' :timeout='600' after="The code you want to remap, for example 'required'"/>
					<n-form-text v-model='code.title' label='Title' :timeout='600' after="The message you want to show the user"/>
					<button class="is-button is-variant-close" @click='target.form.codes.splice(target.form.codes.indexOf(code), 1)'><icon name="times"/></button>
				</div>
			</div>
			<div class="is-row is-align-end">
				<button class="is-button is-size-xsmall is-variant-primary-outline" @click="target.form.codes ? target.form.codes.push({code:null,title:null}) : $window.Vue.set(target.form, 'codes', [{code:null,title:null}])"><icon name="plus"/><span class="is-text">Message</span></button>
			</div>
		</div>
	</div>
</template>

