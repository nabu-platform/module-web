<template id="typography-richtext">
	<div class="typography-richtext">
		<n-form-richtext v-if="edit" :value="cell.state.content" @input="update" :clean-style='cell.state.cleanStyle' :class="{'richtext-empty': !cell.state.content || !cell.state.content.replace(/<[^>]+>/, '') }"/>
		<div v-else-if="!cell.state.highlight" v-content.parameterized="{value:$services.page.translate(cell.state.content), sanitize: true, compile: cell.state.compile }"></div>
		<div v-else v-content="highlight($services.page.translate(cell.state.content))"></div>
	</div>
</template>

<template id="typography-richtext-configure">
	<div class="is-column is-spacing-medium">
		<n-form-switch v-model='cell.state.compile' label='Compile content'/>
	</div>
</template>