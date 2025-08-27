<template id="page-event-value">
	<component :is="inline ? 'div' : 'n-collapsible'" :title="title" class="is-event-value">
		<div :class="{'padded-content': !inline}" class="is-column is-spacing-vertical-gap-small">
			<n-form-text v-model="container[name].name" :label="inline ? title : 'Event Name'" :timeout="600" @input="$updateEvents()" v-if="nameModifiable"/>
			<div v-for="eventField in container[name].eventFields" class="has-button-close is-column is-color-body is-spacing-medium  is-border-full">
				<n-form-text v-model="eventField.name" label="Field Name" :timeout="600"/>
				<n-form-combo v-model="eventField.stateValue" v-if="!eventField.isFixed" label="State Value"
					:filter="function(value) { return (keys ? keys : $services.page.getSimpleKeysFor({properties:$services.page.getAllAvailableParameters(page, null, true)}, true, true)).filter(function(x) { return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0 }) }"/>
				<n-form-text v-model="eventField.fixedValue" v-else label="Fixed Value" :timeout="600"/>
				<n-form-switch v-model="eventField.isFixed" label="Fixed?"/>
				<button @click="container[name].eventFields.splice(container[name].eventFields.indexOf(eventField), 1) & $updateEvents()" class="is-button is-variant-close is-size-small"><icon name="times"/></button>
			</div>
		</div>
		<div class="is-row is-align-end is-spacing-vertical-medium" v-if="container[name].name">
			<button v-if="allowFields" class="is-button is-variant-primary-outline is-size-xsmall" @click="addEventField(container[name]) & $updateEvents()"><icon name="plus"/>Event Field</button>
		</div>
	</component>
</template>
