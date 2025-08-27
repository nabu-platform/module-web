<template id="typography-template">
	<component :is="tag" class="is-content is-typography" :class="['is-' + tag, getChildComponentClasses('typography'), {'has-tooltip': cell.state.tooltip, 'has-icon': cell.state.icon, 'has-text': cell.state.content }]">
		<slot name="before"></slot>
		<img :src="icon.indexOf('http') == 0 ? icon : '${server.root()}resources/' + icon" v-if="icon && icon.match(/^.*\.[^.]+$/)" class="is-icon"/>
		<icon :name="icon" v-if="icon"/>
		<span :class="getChildComponentClasses('tooltip')" class='is-tooltip' v-if='cell.state.tooltip' v-content.sanitize="$services.page.translate($services.page.interpret(cell.state.tooltip, $self))"></span>
		<span class="is-inline-editor" v-if="false && edit && !cell.state.highlight" :contenteditable="true"
			 @keyup="update" @blur="update" @input="update" ref="editor" v-html-once="cell.state.content ? cell.state.content : null"
			 :placeholder="placeholder ? placeholder : tag + ' placeholder'"></span>
		<n-form-richtext v-model="cell.state.content" :support-blocks="false" v-if="edit && !cell.state.highlight" :placeholder="placeholder ? placeholder : tag + ' placeholder'" :show-menu="$services.page.isActiveView('richtext')"/>
		<n-form-text type="area" v-else-if="edit && cell.state.highlight" v-model="cell.state.content"/>
		<span class="is-text" v-else-if="cell.state.content" 
			v-html="cell.state.highlight ? highlight(getContentWithVariables($services.page.translate($services.page.interpret(cell.state.content, $self)))) : getContentWithVariables($services.page.translate($services.page.interpret(cell.state.content, $self)))"></span>
		<slot name="after"></slot>
	</component>
</template>

<template id="typography-variable-replacer">
	<div>
		<div v-for="variable in $services.typography.getVariables(content)" class="is-column is-color-body is-spacing-medium">
			<h4 class="is-h4">{{variable}}</h4>
			<n-form-combo v-model="container.fragments[variable].key" :filter="getAllKeys" label="Variable to bind"/>
			<n-form-text v-model="container.fragments[variable].placeholder" label="Placeholder"/>
			<n-form-switch v-model="container.fragments[variable].synchronous" label="Synchronous value" info="Synchronous values are injected raw but must be available at time of replacement"/>
			<page-formatted-configure :page="page" :cell="cell" 
				:fragment="container.fragments[variable]" 
				:allow-html="true"
				:keys="getAllKeys()"/>
		</div>
	</div>
</template>

<template id="typography-template-configure">
	<div class="typography-template-configure is-column is-spacing-medium">
		<n-form-text v-model="cell.state.icon" label="Icon" v-if="icon"/>
		<n-form-text v-model="cell.state.tooltip" label="Tooltip"/>
		<n-form-ace v-model="cell.state.content" label="Raw content" mode="html"/>
		<n-form-switch v-model="cell.state.highlight" label="Highlight" v-if="highlightable" after="This will perform syntax highlighting, based on the format. If no format is configured, a best effort guess is made"/>
		<n-form-combo v-model="cell.state.highlightFormat" label="Highlight Format" v-if="cell.state.highlight" :items="['code', 'xml', 'markdown']" />
		<typography-variable-replacer :content="cell.state.content" :container="cell.state" :page="page"/>
	</div>
</template>


