<template id="nabu-form-dynamic-component">
	<div class="is-column" :class="getChildComponentClasses('dynamic-field-container')">
		<component v-for="record in records"
			:is="getComponentFor(record)"
			:value="getValueFor(record)"
			@input="function(value, label, field) { update(record, value) }"
			:component-group="cell.state.componentGroup ? cell.state.componentGroup : 'form'"
			:parent-value="getParentValue()"
			:page="page"
			:cell="getParametersFor(record)"
			:disabled="disabled || readOnly"
			:class="{'is-read-only': readOnly }"
			:field="getParametersFor(record).state"
			:label="getLabelFor(record)"
			:timeout="cell.state.timeout"></component>
	</div>
</template>

<template id="nabu-form-dynamic-component-configure">
	<div class="data-trace-viewer-configure is-column is-spacing-medium">
		<n-form-switch v-model="cell.state.stringified" label="Stringified value" after="By default this component expects an array but you can also work on a JSON stringified string that contains an array of key/values. This is primarily useful if it is also stored as such."/>
		<n-form-combo v-model="cell.state.name" label="Field Name" :filter="availableFields" :after="cell.state.stringified ? 'The string field that contains a JSON stringified array' : 'The array of key/values where you want to store the dynamic data'"/>
		
		<p class="is-content is-variant-subscript" v-if="cell.state.stringified">
			The stringified version will be an object where all properties are expressed as a simple key with a string value, for example: { "exampleKey": "exampleValue" }.
			This can be parsed in the backend with a json unmarshal on an object that has a list of properties (e.g. nabu.utils.types.Property).
			It is not stored in the structure of the target object because this component is often used for configuration where values might still need further interpretation based on rules. If such a rule based value were to exist in an integer field however, it could never be parsed correctly.
		</p>
		
		<data-configure :target="cell.state" :page="page"/>
		
		<div v-for="custom in cell.state.custom" class="is-column is-spacing-medium">
			<n-form-text v-model="custom.name" label="Type name"/>
			<n-form-combo v-model="custom.component" label="Component" :filter="getAvailableComponents" :formatter="function(x) { return x.name ? x.name : x.component }" :extracter="function(x) { return x.name }"/>
			<component v-if="getCustomConfiguration(custom)" :is="getCustomConfiguration(custom)" :page="page" :cell="cell" 
				:field="custom.configuration"
				class="is-column is-spacing-gap-medium"/>
		</div>
		<div class="is-row is-align-end is-spacing-vertical-small">
			<button class="is-button is-size-xsmall is-variant-primary-outline" @click="cell.state.custom.push({configuration:{}})"><icon name="plus"/><span class="is-text">Custom type</span></button>
		</div>
	</div>
</template>