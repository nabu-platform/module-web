<template id="page-badge">
	<div class="is-badge" :class="[getChildComponentClasses('page-badge'), {'has-tooltip': !!tooltip}]">
		<img :src="cell.state.icon.indexOf('http') == 0 ? cell.state.icon : $window.application.configuration.root + 'resources/' + cell.state.icon" v-if="cell.state.icon && cell.state.icon.match(/^.*\.[^.]+$/)" class="is-icon"/>
		<icon :name="cell.state.icon" v-if="cell.state.icon"/>
		<span class="is-text" v-if="cell.state.content && !edit" v-html="$services.page.translate(getContentWithVariables($services.page.interpret(cell.state.content, $self)))"></span>
		<span class="is-text is-inline-editor" v-else-if="edit" 
			v-html-once="cell.state.content ? cell.state.content : null"
			ref="editor"
			@keyup="update" @blur="update" @input="update"
			:contenteditable="true"
			placeholder="Badge label"></span>
		<span v-if="tooltip" class="is-tooltip" v-html="tooltip"></span>
	</div>
</template>

<template id="page-badge-configure">
	<div class="is-column">
		
		<div class="is-column is-spacing-medium">
			<n-form-text v-model="cell.state.icon" label="Icon"/>
			<n-form-text v-model="cell.state.tooltip" label="Tooltip" :timeout="600"/>
			<n-form-switch v-model="cell.state.stopPropagation" label="Stop click propagation"/>
			<n-form-switch v-model="cell.state.emitClose" label="Emit close on click" v-if="false"/>
			<n-form-ace mode="javascript" v-model="cell.state.disabled" label="Disabled if"/>
		</div>
		
		<typography-variable-replacer :content="cell.state.content" :container="cell.state" :page="page"/>
	</div>
</template>