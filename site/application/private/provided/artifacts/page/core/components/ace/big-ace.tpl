<template id="big-ace">
	<div class="big-ace">
		<div class="is-row is-align-end is-spacing-medium">
			<button class="is-button is-size-small is-variant-ghost" @click="close"><icon name="times"/></button>
		</div>
		<n-ace :mode='mode' :timeout='timeout' :value='value' @input="function(value) { $emit('input', value) }"/>
	</div>
</template>